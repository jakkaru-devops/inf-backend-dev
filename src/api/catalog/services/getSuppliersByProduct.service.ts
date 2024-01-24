import Product from '../models/Product.model';
import SellerAutoBrands from '../models/relations/SellerAutoBrands.model';
import User from '../../user/models/User.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Organization from '../../organization/models/Organization.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import { Sequelize } from 'sequelize';

interface IProps {
  productId: string;
}

export const getSuppliersByProductService = async ({ productId }: IProps) => {
  if (!productId)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Товар не найден',
    });

  const product: Product = await Product.findByPk(productId);

  const sellerAutoBrands: SellerAutoBrands[] = await SellerAutoBrands.findAll({
    where: {
      autoBrandId: JSON.parse(product?.autoBrandIds),
    },
  });

  const users: User[] = await User.findAll({
    where: {
      id: sellerAutoBrands?.map(sellerAutoBrands => sellerAutoBrands?.userId),
    },
  });

  const organizationSeller: OrganizationSeller[] = await OrganizationSeller.findAll({
    where: {
      userId: users?.map(users => users?.id),
    },
  });

  const organization: Organization[] = await Organization.findAll({
    where: {
      id: organizationSeller.map(organizationSeller => organizationSeller?.organizationId),
    },
    attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('name')), 'name'], 'id', 'inn'],
  });

  const data: {
    id: string;
    name: string;
    inn: string;
  }[] = organization.map(organization => {
    return {
      id: organization.id,
      name: organization.name,
      inn: organization.inn,
    };
  });

  return data;
};
