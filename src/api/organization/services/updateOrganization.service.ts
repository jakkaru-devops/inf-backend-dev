import { Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op, Transaction } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError } from '../../../utils/api.utils';
import { formatPhoneNumber } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import Organization from '../models/Organization.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import OrganizationRejection from '../models/OrganizationRejection.model';
import { getOrgName } from '../utils';
import { updateOrganizationPdfService } from './updateOrganizationPdf.service';
import OrganizationFile from '../models/OrganizationFile.model';
import { MANAGER_ROLES } from '../../role/data';

interface IProps {
  orgData: Organization;
  authUser: User;
  authUserRole: UserRoles;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  org: Organization;
}

export const updateOrganizationService = async ({
  orgData,
  authUser,
  authUserRole,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    // Define search options for organization
    const searchOptions: seq.FindOptions = {
      // attributes: ['id'],
      include: [
        { model: Address, as: 'juristicAddress' },
        { model: Address, as: 'actualAddress' },
        { model: Address, as: 'mailingAddress' },
      ],
      transaction,
    };
    searchOptions.include.push(
      {
        model: OrganizationBranch,
        as: 'branches',
        include: [{ model: Address, as: 'actualAddress' }],
        required: false,
      },
      {
        model: OrganizationRejection,
        as: 'rejections',
        required: false,
        order: [['createdAt', 'DESC']],
        limit: 1,
      },
    );

    // Get organization
    let org = await Organization.findByPk(orgData.id, searchOptions);

    if (orgData.phone) {
      orgData.phone = formatPhoneNumber(orgData.phone);
    }
    // Org confirmation allowed only for manager
    if (!['manager', 'operator'].includes(authUserRole?.role?.label)) {
      delete orgData.confirmationDate;
    }
    // It's not allowed to rewrite org confirmation date
    if (!!org.confirmationDate) {
      orgData.confirmationDate = org.confirmationDate;
    }

    // Update juristic address
    if (orgData.juristicAddress) {
      org.juristicAddress = await org.juristicAddress.update(transformAddress(orgData.juristicAddress), {
        transaction,
      });
    }
    // Update actual address
    if (orgData.actualAddress) {
      org.actualAddress = await org.actualAddress.update(transformAddress(orgData.actualAddress), {
        transaction,
      });
    }
    // Update mailing address
    if (orgData.mailingAddress) {
      org.mailingAddress = await org.mailingAddress.update(transformAddress(orgData.mailingAddress), {
        transaction,
      });
    }

    // Mark rejections as responded
    if (authUserRole.role.label === 'seller' && authUser.id === org.creatorUserId) {
      await OrganizationRejection.update(
        {
          isResponded: true,
        },
        {
          where: {
            organizationId: org.id,
            isResponded: false,
          },
          transaction,
        },
      );
    }

    // Provided branches
    if (orgData.branches) {
      for (const branchData of orgData.branches) {
        const branchEntity = !!branchData?.id && org.branches.find(({ id }) => id === branchData?.id);
        if (branchEntity) {
          await branchEntity.update(
            {
              kpp: branchData.kpp,
            },
            {
              transaction,
            },
          );
          await branchEntity.actualAddress.update(transformAddress(branchData.actualAddress), {
            transaction,
          });
        } else {
          const address = branchData.isMain
            ? org.actualAddress
            : await Address.create(transformAddress(branchData.actualAddress), {
                transaction,
              });
          await OrganizationBranch.create(
            {
              organizationId: org.id,
              actualAddressId: address.id,
              creatorUserId: authUser.id,
              isMain: branchData.isMain,
              confirmationDate: ['manager', 'operator'].includes(authUserRole?.role?.label) ? new Date() : null,
              kpp: branchData.isMain ? orgData.kpp : branchData.kpp,
              bankName: branchData.isMain ? orgData.bankName : branchData.bankName,
              bankInn: branchData.isMain ? orgData.bankInn : branchData.bankInn,
              bankBik: branchData.isMain ? orgData.bankBik : branchData.bankBik,
              bankKs: branchData.isMain ? orgData.bankKs : branchData.bankKs,
              bankRs: branchData.isMain ? orgData.bankRs : branchData.bankRs,
            },
            {
              transaction,
            },
          );
        }
      }
    }

    // Org branches
    for (const branchEntity of org.branches) {
      const isDeleted = !orgData?.branches?.find(branch => branch?.id === branchEntity.id);
      if (!isDeleted || !['manager', 'operator'].includes(authUserRole?.role?.label)) continue; // branch deletion allowed only for manager

      if (branchEntity.isMain) {
        if (orgData.kpp) {
          await branchEntity.update(
            { kpp: orgData.kpp },
            {
              transaction,
            },
          );
        }
      } else {
        if (orgData.branches) {
          await branchEntity.destroy({ transaction });
        }
      }
    }

    const mainBranch = org.branches.find(branch => branch.isMain);
    if (!mainBranch.confirmationDate) {
      await mainBranch.update(
        {
          confirmationDate: new Date(),
        },
        {
          transaction,
        },
      );
    }

    // Only managers allowed to change additional commission
    if (!MANAGER_ROLES.includes(authUserRole.role.label)) {
      delete orgData.priceBenefitPercentAcquiring;
      delete orgData.priceBenefitPercentInvoice;
    }

    // Update organization
    org = await org.update(
      {
        ...orgData,
        name: getOrgName(orgData, true, false),
        nameWithoutType: getOrgName(orgData, false, false),
      },
      { transaction },
    );
    org = await Organization.findByPk(org.id, searchOptions);

    await updateOrganizationPdfService({ organization: org, res, transaction });

    // Update org files
    const filesData = orgData.files;
    for (const fileData of filesData) {
      let orgFile = await OrganizationFile.findOne({
        where: {
          organizationId: org.id,
          label: fileData.label,
        },
        transaction,
      });
      if (!!orgFile) {
        await orgFile.update(
          {
            fileId: fileData?.file?.id,
          },
          { transaction },
        );
      }
      if (!orgFile) {
        await OrganizationFile.create(
          {
            organizationId: org.id,
            fileId: fileData?.file?.id,
            label: fileData.label,
          },
          { transaction },
        );
      }
    }

    if (MANAGER_ROLES.includes(authUserRole.role.label)) {
      if (
        typeof orgData.priceBenefitPercentAcquiring !== 'undefined' ||
        typeof orgData.priceBenefitPercentInvoice !== 'undefined'
      ) {
        io.to(org.creatorUserId).emit('SERVER:ORGANIZATION_COMMISSION_TYPE_CHANGED', {
          organizationId: org.id,
        });
      }
    }

    return {
      org,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении организации',
      error: err,
    });
  }
};
