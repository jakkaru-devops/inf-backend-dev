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
  HasOne,
  BelongsTo,
  AutoIncrement,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Address from '../../address/models/Address.model';
import Organization from './Organization.model';
import OrganizationUpdateApplicationFile from './OrganizationUpdateApplicationFile.model';
import OrganizationUpdateApplicationBranch from './OrganizationUpdateApplicationBranch.model';

@Table({
  tableName: 'OrganizationUpdateApplication',
})
class OrganizationUpdateApplication extends Model<OrganizationUpdateApplication> {
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

  @AllowNull(true)
  @Column(DataTypes.FLOAT)
  priceBenefitPercent: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  priceBenefitPercentAcquiring: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  priceBenefitPercentInvoice: number;

  @AllowNull(false)
  @Column
  hasNds: boolean;

  @AllowNull(false)
  @Column
  shopName: string;

  @AllowNull(false)
  @Column
  email: string;

  @AllowNull(false)
  @Column
  phone: string;

  @AllowNull(false)
  @Column
  directorFirstname: string;

  @AllowNull(false)
  @Column
  directorLastname: string;

  @AllowNull(true)
  @Column
  directorMiddlename: string;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  juristicAddressId: string;
  @BelongsTo(() => Address, 'juristicAddressId')
  juristicAddress?: Address;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  actualAddressId: string;
  @BelongsTo(() => Address, 'actualAddressId')
  actualAddress?: Address;

  @ForeignKey(() => Address)
  @AllowNull(true)
  @Column
  mailingAddressId: string;
  @BelongsTo(() => Address, 'mailingAddressId')
  mailingAddress?: Address;

  @AllowNull(false)
  @Column
  entityCode: string;

  // ИП, ООО и тд
  @AllowNull(true)
  @Column
  entityType: string;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  nameWithoutType: string;

  @AllowNull(false)
  @Column
  inn: string;

  @AllowNull(true)
  @Column
  kpp: string;

  @AllowNull(true)
  @Column
  ogrn: string;

  // Passport
  @AllowNull(true)
  @Column
  passportSeries: string;

  @AllowNull(true)
  @Column
  passportNumber: string;

  @AllowNull(true)
  @Column
  passportGiver: string;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  passportGettingDate: Date;

  @AllowNull(true)
  @Column
  passportLocationUnitCode: string;

  @AllowNull(true)
  @Column
  passportRegistrationAddress: string;
  // /Passport

  @AllowNull(false)
  @Column
  bankName: string;

  @AllowNull(true)
  @Column
  bankInn: string;

  @AllowNull(false)
  @Column
  bankBik: string;

  @AllowNull(false)
  @Column
  bankKs: string;

  @AllowNull(false)
  @Column
  bankRs: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  rejectionMessage: string;

  @AllowNull(true)
  @Column
  rejectedAt: Date;

  @AllowNull(true)
  @Column
  confirmedAt: Date;

  @HasMany(() => OrganizationUpdateApplicationBranch, 'applicationId')
  branches: OrganizationUpdateApplicationBranch[];

  @HasOne(() => OrganizationUpdateApplicationBranch, 'applicationId')
  mainBranch: OrganizationUpdateApplicationBranch;

  @HasMany(() => OrganizationUpdateApplicationFile, 'applicationId')
  files: OrganizationUpdateApplicationFile[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrganizationUpdateApplication;
