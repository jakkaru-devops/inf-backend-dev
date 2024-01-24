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
  Min,
  Max,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import OrganizationBranch from './OrganizationBranch.model';
import OrganizationRejection from './OrganizationRejection.model';
import OrganizationSeller from './OrganizationSeller.model';
import OrganizationFile from './OrganizationFile.model';
import Address from '../../address/models/Address.model';
import Order from '../../order/models/Order.model';
import Notification from '../../notification/models/Notification.model';
import OrganizationUpdateApplication from './OrganizationUpdateApplication.model';
import OrganizationSellerRejection from './OrganizationSellerRejection.model';
import Warehouse from '../../catalog/models/Warehouse.model';
import Product from '../../catalog/models/Product.model';

@Table({
  tableName: 'Organization',
})
class Organization extends Model<Organization> {
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

  @AllowNull(true)
  @Column
  confirmationDate: Date;

  @AllowNull(true)
  @Column
  bannedUntil: Date;

  @AllowNull(false)
  @Min(6)
  @Max(100)
  @Column(DataTypes.FLOAT)
  priceBenefitPercent: number;

  @AllowNull(true)
  @Min(2.5)
  @Max(100)
  @Column(DataTypes.FLOAT)
  priceBenefitPercentAcquiring: number;

  @AllowNull(true)
  @Min(0.1)
  @Max(100)
  @Column(DataTypes.FLOAT)
  priceBenefitPercentInvoice: number;

  @AllowNull(false)
  @Column
  hasNds: boolean;

  @AllowNull(false)
  @Column
  shopName: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  creatorUserId: string;
  @BelongsTo(() => User, 'creatorUserId')
  creatorUser: User;

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

  @Unique
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

  @AllowNull(false)
  @Column
  path: string;

  @HasMany(() => OrganizationSeller, 'organizationId')
  sellers: OrganizationSeller[];

  // To get another list of org sellers
  @HasMany(() => OrganizationSeller, 'organizationId')
  unconfirmedSellers: OrganizationSeller[];

  @HasMany(() => OrganizationBranch, 'organizationId')
  branches: OrganizationBranch[];

  @HasOne(() => OrganizationBranch, 'organizationId')
  mainBranch: OrganizationBranch;

  @HasMany(() => Order, 'organizationId')
  orders: Order[];

  @HasMany(() => OrganizationRejection, 'organizationId')
  rejections: OrganizationRejection[];

  @HasMany(() => OrganizationFile, 'organizationId')
  files: OrganizationFile[];

  @HasMany(() => Notification, 'organizationId')
  notifications: Notification[];

  @HasMany(() => Notification, 'organizationId')
  unreadNotifications: Notification[];

  @HasMany(() => OrganizationUpdateApplication, 'organizationId')
  updateApplications: OrganizationUpdateApplication[];

  @HasMany(() => OrganizationSellerRejection, 'organizationId')
  organizationSellerRejections: OrganizationSellerRejection[];

  @HasMany(() => Warehouse, 'organizationId')
  warehouses: Warehouse[];

  @HasMany(() => Product, 'organizationId')
  products: Product[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  public isServiceOrganization?: boolean;
  public pureName?: string;
}

export default Organization;
