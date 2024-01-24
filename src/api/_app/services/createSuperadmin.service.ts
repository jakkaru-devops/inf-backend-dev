import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import User from '../../user/models/User.model';
import { formatPhoneNumber } from '../../../utils/common.utils';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import { APIError } from '../../../utils/api.utils';

type IProps = {
  phone: string;
  superadminRole: Role;
  res: Response;
  transaction: Transaction;
};

interface IResult {
  user: User;
}

export const createSuperadminService = async ({
  phone,
  superadminRole,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    // Format phone number
    phone = formatPhoneNumber(phone);

    // Find existing user with provided phone number
    const userWithPhone = await User.findOne({
      where: { phone },
    });
    if (userWithPhone) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'User with provided phone number already exists',
      });
    }

    // Create user and user role
    const user = await User.create(
      {
        phone,
        phoneVerificationDate: new Date(),
      },
      {
        transaction,
      },
    );
    const userRole = await UserRoles.create(
      {
        roleId: superadminRole.id,
        userId: user.id,
      },
      {
        transaction,
      },
    );
    if (!user || !userRole) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Superadmin account was not created',
        error: user as any,
      });
    }

    return {
      user,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating root admin',
    });
  }
};
