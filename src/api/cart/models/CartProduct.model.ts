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
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Product from '../../catalog/models/Product.model';
import StockBalance from '../../catalog/models/StockBalance.model';

@Table({
  tableName: 'CartProduct',
})
class CartProduct extends Model<CartProduct> {
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

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product: Product;

  @ForeignKey(() => StockBalance)
  @AllowNull(true)
  @Column
  priceOfferId: number;
  @BelongsTo(() => StockBalance)
  priceOffer?: StockBalance;

  @AllowNull(true)
  @Column
  isSelected: boolean;

  @AllowNull(true)
  @Column
  deliveryMethod: string;

  @AllowNull(true)
  @Column
  acatProductId: string;

  @AllowNull(false)
  @Column
  quantity: number;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default CartProduct;
