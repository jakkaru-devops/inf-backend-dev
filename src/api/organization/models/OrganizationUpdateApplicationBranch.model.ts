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
  DeletedAt,
  BelongsTo,
  ForeignKey,
  AutoIncrement,
  Length,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Address from '../../address/models/Address.model';
import OrganizationUpdateApplication from './OrganizationUpdateApplication.model';
import User from '../../user/models/User.model';

@Table({
  tableName: 'OrganizationUpdateApplicationBranch',
})
class OrganizationUpdateApplicationBranch extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataTypes.UUIDV4)
  @Column
  id: string;

  @Unique
  @AutoIncrement
  @Column
  idInt?: number;

  @ForeignKey(() => OrganizationUpdateApplication)
  @AllowNull(false)
  @Column
  applicationId: string;
  @BelongsTo(() => OrganizationUpdateApplication, 'applicationId')
  application?: OrganizationUpdateApplication;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  actualAddressId: string;
  @BelongsTo(() => Address, 'actualAddressId')
  actualAddress?: Address;

  @AllowNull(true)
  @Column
  branchId: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  creatorUserId: string;
  @BelongsTo(() => User, 'creatorUserId')
  creatorUser: User;

  @AllowNull(true)
  @Length({ min: 9, max: 9 })
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

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrganizationUpdateApplicationBranch;
