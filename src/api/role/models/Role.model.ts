import {
  Table,
  Model,
  IsUUID,
  PrimaryKey,
  Unique,
  Default,
  Column,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  HasMany,
  AllowNull,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import UserRoles from './UserRoles.model';
import ChatMember from '../../messenger/models/ChatMember.model';
import ChatMessage from '../../messenger/models/ChatMessage.model';
import Notification from '../../notification/models/Notification.model';
import { IUserRoleOption } from '../interfaces';

@Table({
  tableName: 'Role',
})
class Role extends Model<Role> {
  @IsUUID(4)
  @PrimaryKey
  @Unique
  @Default(DataTypes.UUIDV4)
  @Column
  id?: string;

  @Unique
  @AutoIncrement
  @Column
  idInt?: number;

  @AllowNull(false)
  @Unique
  @Column
  label: IUserRoleOption;

  @HasMany(() => UserRoles, 'roleId')
  userRoles: UserRoles[];

  // Permissions
  @AllowNull(false)
  @Default(false)
  @Column
  favouriteProductsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  cartAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  offersAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  refundAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  personalDataAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  chatAvailable: boolean; // is everywhere ?

  @AllowNull(false)
  @Default(false)
  @Column
  supportChatsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  readReviewAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  writeComplainAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  writeReviewAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageSellerDataAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageRefundAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  organizationsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  sellerDataAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  requestProductChangeAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageDigitizationAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  readComplainAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  selectCategoriesAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageAllSellerDataAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageAllRefundAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  moderateOrganizationsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  moderateProductChangeAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  moderateSellerDataAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  moderateDigitizationAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  moderateComplainAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageCategoriesAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageAdminsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageRolesAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  banAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageEmployeesAvailable: boolean;

  // Orders
  @AllowNull(false)
  @Default(false)
  @Column
  exploreAllOrderRequestsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  requestOrdersPlusHistoryAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageOrderRequestsAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  exploreOrderRequestsAndOrdersAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  suggestOrdersAvailable: boolean;

  // Transport Companies
  @AllowNull(false)
  @Default(false)
  @Column
  transportСompanyAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  manageTransportСompanyAvailable: boolean;

  // Other
  @AllowNull(false)
  @Default(false)
  @Column
  inspectUsersInfoAvailable: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  rewardsAvailable: boolean;

  @HasMany(() => ChatMember, 'roleId')
  chatMembers: ChatMember[];

  @HasMany(() => ChatMessage, 'authorRoleId')
  chatMessages: ChatMessage[];

  @HasMany(() => Notification, 'roleId')
  notifications: Notification[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Role;
