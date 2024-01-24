import User from '../../user/models/User.model';
import moment from 'moment';
import { JwtPayload } from '../../../interfaces/auth.interfaces';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../../../utils/auth.utils';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import { IUserRoleOption } from '../../role/interfaces';

interface IProps {
  userId: User['id'];
  roleLabel: IUserRoleOption;
}

export const getUserTokenService = async ({ userId, roleLabel }: IProps) => {
  const expires: number = moment().utc().add({ days: 7 }).unix();

  const payload: JwtPayload = {
    id: userId,
    expires,
  };

  const token: string = jwt.sign(payload, getJwtSecret());

  const roleEntity = await Role.findOne({
    where: {
      label: roleLabel,
    },
  });

  const userRole = await UserRoles.findOne({
    where: {
      roleId: roleEntity.id,
      userId,
    },
  });
  if (!userRole) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Пользователь не найден' });

  return {
    payload: token,
    role: roleEntity.id,
  };
};
