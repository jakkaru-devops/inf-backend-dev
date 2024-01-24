import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import SocketIO from 'socket.io';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import { createNotification } from '../../notification/services/createNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import { formatPhoneNumber } from '../../../utils/common.utils';
import Organization from '../models/Organization.model';
import OrganizationUpdateApplication from '../models/OrganizationUpdateApplication.model';
import OrganizationFile from '../models/OrganizationFile.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import { getOrgName } from '../utils';
import { updateOrganizationPdfService } from './updateOrganizationPdf.service';
import OrganizationSeller from '../models/OrganizationSeller.model';
import OrganizationUpdateApplicationBranch from '../models/OrganizationUpdateApplicationBranch.model';
import { IOrganizationData } from '../interfaces';

interface IProps {
  applicationId: string;
  organizationData: IOrganizationData;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  organization: Organization;
  organizationUpdateApplication: OrganizationUpdateApplication;
}

export const confirmOrganizationUpdateApplicationService = async ({
  applicationId,
  organizationData,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    // Поиск заявки на обновление или создание филиала
    let application = await OrganizationUpdateApplication.findOne({
      where: {
        id: applicationId,
        rejectedAt: null,
        confirmedAt: null,
      },
      order: [['createdAt', 'DESC']], // get the last application
    });

    if (!application) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Заявка не найдена',
      });
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////  обновление данных филиала  ///////////////////////////////////

    // Поиск продавца
    const organizationSellerEntity = await OrganizationSeller.findOne({
      where: {
        userId: application.userId,
      },
      transaction,
    });

    // Поиск id филиала к которому прикрепляем продавца
    const organizationUpdateApplicationBranch = await OrganizationUpdateApplicationBranch.findOne({
      where: {
        applicationId: application.id,
      },
      transaction,
    });

    let branchId: string;
    let address: Address;

    if (!organizationUpdateApplicationBranch.branchId) {
      // Филиала нет. Создаем.
      const newBranch = await OrganizationBranch.create(
        {
          organizationId: application.organizationId,
          actualAddressId: organizationUpdateApplicationBranch.actualAddressId,
          creatorUserId: organizationUpdateApplicationBranch.creatorUserId,
          isMain: false,
          kpp: organizationData.branchKpp,
          bankName: organizationData.branchBankName,
          bankInn: organizationData?.branchBankInn,
          bankBik: organizationData.branchBankBik,
          bankKs: organizationData.branchBankKs,
          bankRs: organizationData.branchBankRs,
          confirmationDate: new Date(),
        },
        {
          transaction,
        },
      );

      branchId = newBranch.id;

      address = await Address.findByPk(newBranch.actualAddressId, { transaction });
    } else {
      // Филиал уже есть.

      branchId = organizationUpdateApplicationBranch.branchId;

      // Поиск и обновление данных уже созданого филиала
      const branch = await OrganizationBranch.findByPk(branchId, { transaction });
      await branch.update({
        kpp: organizationData.branchKpp,
        bankName: organizationData.branchBankName,
        bankInn: organizationData?.branchBankInn,
        bankBik: organizationData.branchBankBik,
        bankKs: organizationData.branchBankKs,
        bankRs: organizationData.branchBankRs,
        confirmationDate: new Date(),
      });

      // Поиск адреса данного филиала
      address = await Address.findByPk(branch.actualAddressId, { transaction });
    }

    // Перезапись филиала у продавца
    await organizationSellerEntity.update({ branchId }, { transaction });
    // Обновление информации об адресе филиала
    await address.update(transformAddress({ ...organizationData.branchAddress }), {
      transaction,
    });

    ///////////////////////////////////////////////////////////////////////////////////////////////
    //////////////////////////////// Обновление данных организвации ///////////////////////////////

    let organization = await Organization.findByPk(application.organizationId, {
      include: [
        {
          model: Address,
          as: 'juristicAddress',
        },
        {
          model: Address,
          as: 'actualAddress',
        },
        {
          model: Address,
          as: 'mailingAddress',
        },
        {
          model: OrganizationBranch,
          as: 'branches',
        },
        {
          model: OrganizationFile,
          as: 'files',
        },
      ],
      transaction,
    });

    organization.juristicAddress = await organization.juristicAddress.update(
      transformAddress({
        ...organizationData.juristicAddress,
      }),
      {
        transaction,
      },
    );

    organization.actualAddress = await organization.actualAddress.update(
      transformAddress({
        ...organizationData.actualAddress,
      }),
      {
        transaction,
      },
    );

    for (let i = 0; i < organization.files.length; i++) {
      const orgFileEntity = organization.files[i];
      const orgFileData = organizationData.files.find(el => el.label === orgFileEntity.label);
      organization.files[i] = await orgFileEntity.update(
        {
          fileId: orgFileData?.file?.id,
        },
        {
          transaction,
        },
      );
    }

    const updatedOrganization = await organization.update(
      {
        ...organizationData,
        phone: formatPhoneNumber(organizationData?.phone),
      },
      {
        transaction,
      },
    );

    organization = {
      ...updatedOrganization.toJSON(),
      juristicAddress: organization.juristicAddress.toJSON(),
      actualAddress: organization.actualAddress.toJSON(),
      files: organization.files.map(el => el.toJSON()),
    } as Organization;

    await updateOrganizationPdfService({ organization, res, transaction });

    application = await application.update(
      {
        confirmedAt: new Date(),
      },
      {
        transaction,
      },
    );

    await createNotification({
      userId: application.userId,
      role: 'seller',
      type: ENotificationType.organizationUpdateApplicationConfirmed,
      autoread: true,
      organizationId: organization.id,
      data: {
        organization: {
          id: organization.id,
          name: getOrgName(organization, true, true),
        },
        applicationId: application.id,
      },
      io,
      res,
      transaction,
    });

    return {
      organization,
      organizationUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных организации не была подтверждена',
      error: err,
    });
  }
};
