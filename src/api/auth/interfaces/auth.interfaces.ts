import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';

export interface IAuth {
  user: User;
  currentRole: UserRoles;
}

export interface ILoginPayload {
  expires?: number;
  token: string;
}
