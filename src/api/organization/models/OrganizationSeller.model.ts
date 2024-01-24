import {
  Table,
  Unique,
  Column,
  PrimaryKey,
  IsUUID,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
  Model,
  HasMany,
  DeletedAt,
  BelongsTo,
  AutoIncrement,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Organization from './Organization.model';
import OrganizationBranch from './OrganizationBranch.model';
import OrganizationSellerRejection from './OrganizationSellerRejection.model';
import Order from '../../order/models/Order.model';

@Table({
  tableName: 'OrganizationSeller',
})
class OrganizationSeller extends Model<OrganizationSeller> {
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

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column
  organizationId: string;
  @BelongsTo(() => Organization, 'organizationId')
  organization?: Organization;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @ForeignKey(() => OrganizationBranch)
  @AllowNull(false)
  @Column
  branchId: string;
  @BelongsTo(() => OrganizationBranch, 'branchId')
  branch?: OrganizationBranch;

  @AllowNull(true)
  @Column
  confirmationDate: Date;

  @AllowNull(true)
  @Column
  detachedAt: Date;

  @HasMany(() => OrganizationSellerRejection, 'organizationSellerId')
  rejections: OrganizationSellerRejection[];

  @HasMany(() => Order, 'organizationSellerId')
  orders: Order[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrganizationSeller;
