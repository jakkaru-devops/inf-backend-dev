import { Response } from 'express';
import httpStatus from 'http-status';
import { Op, Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import Address from '../../address/models/Address.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import Organization from '../models/Organization.model';
import OrganizationSeller from '../models/OrganizationSeller.model';

interface IProps {
  sellerId: string;
  res: Response;
  transaction?: Transaction;
}

export const getSellerOrganizationsBranchesService = async ({
  sellerId,
  res,
  transaction,
}: IProps): Promise<{ branches: OrganizationBranch[] }> => {
  try {
    const orgSellers = await OrganizationSeller.findAll({
      where: {
        userId: sellerId,
        confirmationDate: {
          [Op.ne]: null,
        },
        detachedAt: null,
      },
      transaction,
    });
    let branches = (
      await OrganizationBranch.findAll({
        where: {
          id: orgSellers.map(orgSeller => orgSeller.branchId),
          confirmationDate: {
            [Op.ne]: null,
          },
          isMain: false,
        },
        include: [
          { model: Organization, as: 'organization', required: true },
          { model: Address, as: 'actualAddress', required: true },
        ],
        transaction,
      })
    ).map(el => el.toJSON() as OrganizationBranch);

    return {
      branches,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке филиалов продавца',
      error: err,
    });
  }
};
