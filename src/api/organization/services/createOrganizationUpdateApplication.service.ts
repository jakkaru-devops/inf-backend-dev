import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import { ENotificationType } from '../../notification/interfaces';
import OrganizationUpdateApplication from '../models/OrganizationUpdateApplication.model';
import Organization from '../models/Organization.model';
import User from '../../user/models/User.model';
import OrganizationUpdateApplicationBranch from '../models/OrganizationUpdateApplicationBranch.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import { formatPhoneNumber, getUserName } from '../../../utils/common.utils';
import { getOrgName } from '../utils';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';
import { SocketServer } from '../../../core/socket';
import { ServiceError } from '../../../core/utils/serviceError';
import { IOrganizationData } from '../interfaces';

interface IProps {
  authUser: User;
  organizationId: string;
  organizationData: IOrganizationData;
}

interface IResult {
  organizationUpdateApplication: OrganizationUpdateApplication;
}

export const createOrganizationUpdateApplicationService = async (
  { authUser, organizationId, organizationData }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
): Promise<IResult> => {
  try {
    //
    const activeApplication = await OrganizationUpdateApplication.findOne({
      where: {
        userId: authUser.id,
        organizationId,
        rejectedAt: null,
        confirmedAt: null,
      },
      order: [['createdAt', 'DESC']], // get the last application
      transaction,
    });

    if (!!activeApplication) {
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: 'У вас уже есть активная заявка на редактирование данных организации',
      });
    }

    const organization = await Organization.findByPk(organizationId, {
      transaction,
    });

    // Заявка на обновление данных организации
    const application = await OrganizationUpdateApplication.create(
      {
        ...organizationData,
        juristicAddressId: organization.juristicAddressId,
        actualAddressId: organization.actualAddressId,
        phone: formatPhoneNumber(organizationData.phone),
        organizationId,
        userId: authUser.id,
        entityCode: organizationData.entityCode,
        entityType: organizationData.entityType,
        name: getOrgName(organizationData, true, false),
        nameWithoutType: getOrgName(organizationData, false, false),
      },
      {
        transaction,
      },
    );

    if (!organizationData?.branchId) {
      console.log('organizationData', organizationData);

      // Создание нового филиала и прикрепления за ним продавца который подал заявку
      const address = await Address.create(transformAddress({ ...organizationData.actualAddress }), {
        transaction,
      });

      await OrganizationUpdateApplicationBranch.create(
        {
          applicationId: application.id,
          actualAddressId: address.id,
          creatorUserId: authUser.id,
          branchId: null,
          kpp: null,
          bankName: organizationData.bankName,
          bankInn: organizationData.bankInn,
          bankBik: organizationData.bankBik,
          bankKs: organizationData.bankKs,
          bankRs: organizationData.bankRs,
        },
        {
          transaction,
        },
      );
    } else {
      // Переводим продавца в уже существующий филиал
      const branch = await OrganizationBranch.findByPk(organizationData.branchId, { transaction });

      await OrganizationUpdateApplicationBranch.create(
        {
          applicationId: application.id,
          actualAddressId: branch.actualAddressId,
          branchId: branch.id,
          kpp: branch.kpp,
          bankName: branch.bankName,
          bankInn: branch.bankInn,
          bankBik: branch.bankBik,
          bankKs: branch.bankKs,
          bankRs: branch.bankRs,
        },
        {
          transaction,
        },
      );
    }

    await createNotificationForAllManagersService({
      type: ENotificationType.organizationUpdateApplicationCreated,
      autoread: false,
      organizationId: organization.id,
      data: {
        organization: {
          id: organization.id,
          name: getOrgName(organization, true, true),
        },
        applicationId: application.id,
        user: {
          id: authUser.id,
          name: getUserName(authUser),
        },
      },
      io,
      transaction,
    });

    return {
      organizationUpdateApplication: application,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных не создана',
      error: err,
    });
  }
};
