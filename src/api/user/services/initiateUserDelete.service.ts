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
import addDate from 'date-fns/add';

interface IProps {
  userId: User['id'];
  authUser: User;
  authUserRole: UserRoles;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  user: User;
}

export const initiateUserDeleteService = async ({
  userId,
  authUser,
  authUserRole,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    if (authUserRole.role.label !== 'superadmin' && userId !== authUser.id) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Вы можете удалить только свой профиль',
      });
    }

    let user = await User.findByPk(userId, { transaction });
    if (!!user?.deletionAt) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Удаление профиля уже инициировано',
      });
    }

    const deletionDate = addDate(new Date(), {
      days: 30,
    });
    user = await user.update(
      {
        deletionAt: deletionDate,
      },
      { transaction },
    );

    return {
      user,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при удалении пользователя',
      error: err,
    });
  }
};
