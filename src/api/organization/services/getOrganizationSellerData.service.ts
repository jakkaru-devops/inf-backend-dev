import { Op, Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import Organization from '../models/Organization.model';
import OrganizationSeller from '../models/OrganizationSeller.model';
import OrganizationBranch from '../models/OrganizationBranch.model';

interface IProps {
  userId: User['id'];
  organizationId: Organization['id'];
}

export const getOrganizationSellerDataService = async (
  { userId, organizationId }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const organizationSeller = await OrganizationSeller.findOne({
    where: {
      organizationId,
      userId,
      confirmationDate: { [Op.ne]: null },
      detachedAt: null,
    },
    transaction,
  });

  if (!organizationSeller)
    return {
      organizationSeller: null,
      organizationBranch: null,
    };

  const organizationBranch = await OrganizationBranch.findByPk(organizationSeller.branchId, { transaction });

  return {
    organizationSeller,
    organizationBranch,
  };
};
