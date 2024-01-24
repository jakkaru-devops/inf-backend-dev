import { Transaction } from 'sequelize';
import User from '../../api/user/models/User.model';
import UserRoles from '../../api/role/models/UserRoles.model';

export interface IServiceParams {
  authUser?: User;
  authUserRole?: UserRoles;
  transaction: Transaction;
}
