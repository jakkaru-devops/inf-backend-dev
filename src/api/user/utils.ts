import Role from '../role/models/Role.model';
import UserRoles from '../role/models/UserRoles.model';
import { IUserRoleSimplified, IUserSimplified } from './interfaces';
import User from './models/User.model';

/**
 * @desc Transform user to send to client app
 */
export const simplifyUser = (user: User): IUserSimplified => {
  const resultUser: IUserSimplified = user as any;
  if (!resultUser) return null;
  if (resultUser.roles) {
    resultUser.roles = user.roles.map(
      userRole =>
        ({
          id: userRole.role.id,
          label: userRole.role.label,
          bannedUntil: userRole.bannedUntil,
          requestsBannedUntil: userRole.requestsBannedUntil,
          bannedReason: userRole.bannedReason,
          createdAt: userRole.createdAt,
        } as IUserRoleSimplified),
    );
  }
  if (!!resultUser?.minusRating) {
    resultUser.ratingValue = resultUser.ratingValue - resultUser?.minusRating;
    if (resultUser.ratingValue < 0) resultUser.ratingValue = 0;
  }

  return resultUser;
};

export const isManager = (userRole: UserRoles) => {
  return (['manager', 'operator'] as Array<Role['label']>).includes(userRole?.role?.label);
};
