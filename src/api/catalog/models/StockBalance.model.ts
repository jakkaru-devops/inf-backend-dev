import {
  Table,
  Column,
  PrimaryKey,
  AllowNull,
  Model,
  HasMany,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  Default,
  HasOne,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Warehouse from './Warehouse.model';
import Product from './Product.model';
import CartProduct from '../../cart/models/CartProduct.model';
import Organization from '../../organization/models/Organization.model';
import { Sale } from './Sale.model';

@Table({
  tableName: 'StockBalance',
})
class StockBalance extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Column
  warehouseId: string;
  @BelongsTo(() => Warehouse, 'warehouseId')
  warehouse?: Warehouse;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product?: Product;

  @AllowNull(false)
  @Column(DataTypes.DOUBLE)
  price: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  previousPrice: number;

  @AllowNull(false)
  @Column
  amount: number;

  @AllowNull(false)
  @Column
  relevance: Date;

  @AllowNull(true)
  @Column
  brand: string;

  @AllowNull(true)
  @Column
  nameInPrice: string;

  @AllowNull(true)
  @Column
  userId: string;

  @AllowNull(false)
  @Default(false)
  @Column
  forSale: boolean;

  @AllowNull(true)
  @Column
  internalCode: string;

  @AllowNull(true)
  @Column(DataTypes.INTEGER)
  syncParams: number;

  @AllowNull(true)
  @Column
  partnumberInPrice: string;

  @HasMany(() => CartProduct, 'priceOfferId')
  cartProductcs?: CartProduct[];

  @HasOne(() => Sale, { foreignKey: 'priceOfferId', onDelete: 'CASCADE', hooks: true })
  sale: Sale;

  public organizationId?: string;
  public organization?: Organization;
}

export default StockBalance;
