import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import Requisites from '../models/Requisites.model';
import User from '../models/User.model';
import { updateSellerProductCategoriesService } from './updateSellerProductCategories.service';
import { validateEmail } from '../../../utils/common.utils';
import UserRoles from '../../role/models/UserRoles.model';
import Role from '../../role/models/Role.model';
import { Op } from 'sequelize';

interface IProps {
  userId: User['id'];
  authUser: User;
  authUserRole: UserRoles;
  res: Response;
  transaction: Transaction;
}

export const deleteUserService = async ({
  userId,
  authUser,
  authUserRole,
  res,
  transaction,
}: IProps): Promise<void> => {
  try {
    if (authUserRole.role.label !== 'superadmin' && userId !== authUser.id) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Вы можете удалить только свой профиль',
      });
    }

    const clientRoles = await Role.findAll({ where: { label: ['customer', 'seller'] }, transaction });
    await UserRoles.destroy({
      where: {
        roleId: {
          [Op.in]: clientRoles.map(el => el.id),
        },
        userId,
      },
      transaction,
    });
    await User.destroy({
      where: {
        id: userId,
      },
      transaction,
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при удалении пользователя',
      error: err,
    });
  }
};
