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
  Length,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Address from '../../address/models/Address.model';
import Organization from './Organization.model';
import OrganizationSeller from './OrganizationSeller.model';
import OrganizationUpdateApplicationBranch from './OrganizationUpdateApplicationBranch.model';

@Table({
  tableName: 'OrganizationBranch',
})
class OrganizationBranch extends Model<OrganizationBranch> {
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

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  actualAddressId: string;
  @BelongsTo(() => Address, 'actualAddressId')
  actualAddress?: Address;

  @AllowNull(true)
  @Column
  confirmationDate: Date;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  creatorUserId: string;
  @BelongsTo(() => User, 'creatorUserId')
  creatorUser: User;

  @Default(false)
  @AllowNull(false)
  @Column
  isMain: boolean;

  @AllowNull(true)
  @Column
  kpp: string;

  @AllowNull(true)
  @Column
  bankName: string;

  @AllowNull(true)
  @Column
  bankInn: string;

  @AllowNull(true)
  @Column
  bankBik: string;

  @AllowNull(true)
  @Column
  bankKs: string;

  @AllowNull(true)
  @Column
  bankRs: string;

  @HasMany(() => OrganizationSeller, 'branchId')
  sellers: OrganizationSeller[];

  // To get another list of org sellers
  @HasMany(() => OrganizationSeller, 'branchId')
  unconfirmedSellers: OrganizationSeller[];

  @HasMany(() => OrganizationUpdateApplicationBranch, 'branchId')
  organizationUpdateApplicationBranches: OrganizationUpdateApplicationBranch[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrganizationBranch;
