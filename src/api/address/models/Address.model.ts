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
  AutoIncrement,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import Region from '../../regions/models/Region.model';
import Settlement from '../../regions/models/Settlement.model';
import DeliveryAddress from './DeliveryAddress.model';
import Organization from '../../organization/models/Organization.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import SellerUpdateApplication from '../../user/models/SellerUpdateApplication.model';
import Order from '../../order/models/Order.model';
import Warehouse from '../../catalog/models/Warehouse.model';
import Product from '../../catalog/models/Product.model';
import { Sale } from '../../catalog/models/Sale.model';

@Table({
  tableName: 'Address',
})
class Address extends Model<Address> {
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
  @Column
  country: string;

  @AllowNull(true)
  @Column
  region: string;

  @AllowNull(true)
  @Column
  area: string;

  @AllowNull(true)
  @Column
  city: string;

  @AllowNull(true)
  @Column
  settlement: string;

  @AllowNull(true)
  @Column
  street: string;

  @AllowNull(true)
  @Column
  building: string;

  @AllowNull(true)
  @Column
  apartment: string;

  @AllowNull(true)
  @Column
  postcode: string;

  @HasMany(() => User, 'addressId')
  users: User[];

  @HasMany(() => OrderRequest, 'deliveryAddressId')
  orderDeliveryAddress: OrderRequest[];

  @HasMany(() => JuristicSubject, 'juristicAddressId')
  juristicSubjectsByJuristicAddress: JuristicSubject[];

  @HasMany(() => JuristicSubject, 'mailingAddressId')
  juristicSubjectsByMailingAddress: JuristicSubject[];

  @HasMany(() => DeliveryAddress, 'addressId')
  deliveryAddresses: DeliveryAddress[];

  @HasMany(() => Organization, 'juristicAddressId')
  organizationsByJuristicAddress: Organization[];

  @HasMany(() => Organization, 'actualAddressId')
  organizationsByActualAddress: Organization[];

  @HasMany(() => Organization, 'mailingAddressId')
  organizationsByMailingAddress: Organization[];

  @HasMany(() => OrganizationBranch, 'actualAddressId')
  organizationBranchesByActualAddress: OrganizationBranch[];

  @HasMany(() => SellerUpdateApplication, 'addressId')
  sellerUpdateApplications: SellerUpdateApplication[];

  @HasMany(() => Order)
  offersBySupplierAddress: Order[];

  @HasMany(() => Warehouse, 'addressId')
  warehouses: Warehouse[];

  @HasMany(() => Sale)
  sales: Sale[];

  @ForeignKey(() => Region)
  @AllowNull(true)
  @Column(DataTypes.UUID)
  regionFiasId: string;
  @BelongsTo(() => Region, 'regionFiasId')
  regions?: Region[];

  @ForeignKey(() => Settlement)
  @AllowNull(true)
  @Column(DataTypes.UUID)
  areaFiasId: string;
  @BelongsTo(() => Settlement, 'areaFiasId')
  areaFias?: Settlement[];

  @ForeignKey(() => Settlement)
  @AllowNull(true)
  @Column(DataTypes.UUID)
  cityFiasId: string;
  @BelongsTo(() => Settlement, 'cityFiasId')
  cityFias?: Settlement[];

  @ForeignKey(() => Settlement)
  @AllowNull(true)
  @Column(DataTypes.UUID)
  settlementFiasId: string;
  @BelongsTo(() => Settlement, 'settlementFiasId')
  settlementFias?: Settlement[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Address;
