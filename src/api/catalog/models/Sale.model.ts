import {
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  Model,
  DeletedAt,
  BelongsTo,
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import User from '../../user/models/User.model';
import Product from './Product.model';
import StockBalance from './StockBalance.model';
import Organization from '../../organization/models/Organization.model';
import Address from '../../address/models/Address.model';

@Table({
  tableName: 'Sale',
})
export class Sale extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product: Product;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user: User;

  @ForeignKey(() => StockBalance)
  @AllowNull(false)
  @Column
  priceOfferId: number;
  @BelongsTo(() => StockBalance, 'priceOfferId')
  priceOffer: StockBalance;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column
  organizationId: string;
  @BelongsTo(() => Organization, 'organizationId')
  organization?: Organization;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  supplierAddressId: string;
  @BelongsTo(() => Address, 'supplierAddressId')
  supplierAddress?: Address;

  @AllowNull(false)
  @Column
  regionId: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  public price: number;
  public previousPrice: number;
  public amount: number;
}
