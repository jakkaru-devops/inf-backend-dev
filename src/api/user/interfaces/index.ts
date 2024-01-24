import { IAddress } from '../../address/interfaces';
import { IUserRoleOption } from '../../role/interfaces';
import Role from '../../role/models/Role.model';
import User from '../models/User.model';

export interface IUser extends User {
  isOnline: boolean;
}

export interface IUserSimplified extends Omit<User, 'roles'> {
  roles: IUserRoleSimplified[];
}

export interface IUserRoleSimplified {
  id: Role['id'];
  label: IUserRoleOption;
  bannedUntil?: Date;
  requestsBannedUntil?: Date;
  bannedReason?: ('spam' | 'behaviour' | 'fraud' | 'nonobservance')[];
  createdAt?: Date;
}

export interface IJuristicSubjectByInn {
  id?: string;
  isRegistered?: boolean;
  entityType?: number;
  inn: string;
  kpp: string;
  ogrn?: string;
  name?: string;
  shopName?: string;
  directorFirstname?: string;
  directorLastname?: string;
  directorMiddlename?: string;
  juristicAddress?: IAddress;
  mailingAddress?: IAddress;
}
