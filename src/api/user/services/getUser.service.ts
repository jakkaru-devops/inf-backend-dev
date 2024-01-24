import seq, { WhereOptions } from 'sequelize';
import { formatPhoneNumber } from '../../../utils/common.utils';
import User from '../models/User.model';
import Address from '../../address/models/Address.model';
import Requisites from '../models/Requisites.model';
import UserRoles from '../../role/models/UserRoles.model';
import Role from '../../role/models/Role.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import Organization from '../../organization/models/Organization.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import OrganizationSellerRejection from '../../organization/models/OrganizationSellerRejection.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import FileModel from '../../files/models/File.model';
import SellerTransportCompany from '../models/SellerTransportCompany.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import RefundExchangeRequest from '../../order/models/RefundExchangeRequest.model';
import Order from '../../order/models/Order.model';
import { simplifyUser } from '../utils';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  id?: User['id'];
  phone?: string;
  include?: Array<
    | 'address'
    | 'requisites'
    | 'roles'
    | 'sellerAutoBrands'
    | 'sellerProductGroups'
    | 'sellers'
    | 'sellers.rejections'
    | 'sellerRegisterFiles'
    | 'transportCompanies'
    | 'sellerRefundsNumber'
  >;
  organizationId?: Organization['id'];
}

export const getUserService = async ({ id, phone, include, organizationId }: IProps) => {
  const options: seq.FindOptions = {};
  options.where = {};
  options.include = [];
  const resultData: any = {};

  if (id) {
    options.where.id = id;
  }
  if (phone) {
    options.where.phone = formatPhoneNumber(phone);
  }

  let user = await User.findOne(options);
  user = user.toJSON() as User;

  if (include?.includes('address') && !!user?.addressId) {
    const address = await Address.findByPk(user?.addressId);
    user.address = (address?.toJSON() as Address) || null;
  }
  if (include?.includes('requisites')) {
    const requisites = await Requisites.findOne({
      where: {
        userId: user.id,
      },
    });
    user.requisites = (requisites?.toJSON() as Requisites) || null;
  }
  if (include?.includes('roles')) {
    const roles = await UserRoles.findAll({
      where: {
        userId: user.id,
      },
      include: [{ model: Role, as: 'role', required: false }],
    });
    user.roles = roles.map(el => el?.toJSON() as UserRoles);
  }
  if (include?.includes('sellerAutoBrands')) {
    const sellerAutoBrands = await SellerAutoBrands.findAll({
      where: {
        userId: user.id,
      },
    });
    user.sellerAutoBrands = sellerAutoBrands.map(el => el?.toJSON() as SellerAutoBrands);
  }
  if (include?.includes('sellerProductGroups')) {
    const sellerProductGroups = await SellerProductGroups.findAll({
      where: {
        userId: user.id,
      },
    });
    const groups = !!sellerProductGroups?.length
      ? await ProductGroup.findAll({
          where: {
            id: sellerProductGroups.map(el => el.productGroupId),
          },
        })
      : [];
    user.sellerProductGroups = groups.map(el => el?.toJSON() as ProductGroup);
  }
  if (include?.includes('sellers')) {
    const whereSellers: WhereOptions = {
      userId: user.id,
    };
    if (!!organizationId) whereSellers.organizationId = organizationId;

    const sellers = await OrganizationSeller.findAll({
      where: whereSellers,
      include: include?.includes('sellers.rejections')
        ? [
            {
              model: OrganizationSellerRejection,
              as: 'rejections',
              required: false,
              order: [['createdAt', 'DESC']],
              limit: 1,
            },
          ]
        : [],
    });
    user.sellers = sellers.map(el => el?.toJSON() as OrganizationSeller);
  }
  if (include?.includes('sellerRegisterFiles')) {
    const sellerRegisterFiles = await SellerRegisterFile.findAll({
      where: {
        userId: user.id,
      },
      include: [{ model: FileModel, as: 'file', required: true }],
    });
    user.sellerRegisterFiles = sellerRegisterFiles.map(el => el?.toJSON() as SellerRegisterFile);
  }
  if (include?.includes('transportCompanies')) {
    const sellerTransportCompanies = await SellerTransportCompany.findAll({
      where: {
        sellerId: user.id,
      },
    });
    const transportCompanies = !!sellerTransportCompanies?.length
      ? await TransportCompany.findAll({
          where: {
            id: sellerTransportCompanies.map(el => el.transportCompanyId),
          },
        })
      : [];
    user.transportCompanies = transportCompanies.map(el => el?.toJSON() as TransportCompany);
  }

  if (include?.includes('sellerRefundsNumber')) {
    const refundRequests = await RefundExchangeRequest.findAll({
      include: [
        {
          model: Order,
          as: 'order',
          required: true,
          where: {
            sellerId: id,
          },
        },
      ],
    });
    resultData.sellerRefundsNumber = refundRequests.length;
  }

  // Simplify user
  user = simplifyUser(user) as any;

  if (!user) {
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Пользователь не найден',
    });
  }

  (user as any).sellerRefundsNumber = resultData?.sellerRefundsNumber || 0;

  return user;
};
