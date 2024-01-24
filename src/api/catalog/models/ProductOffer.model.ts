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
  HasMany,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import { PRODUCT_OFFER_STATUSES } from '../data';
import Product from './Product.model';
import Notification from '../../notification/models/Notification.model';

@Table({
  tableName: 'ProductOffer',
})
class ProductOffer extends Model<ProductOffer> {
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
  sellerId: string;
  @BelongsTo(() => User, 'sellerId')
  seller: User;

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product: Product;

  @ForeignKey(() => Product)
  @AllowNull(true)
  @Column
  sourceProductId: string;
  @BelongsTo(() => Product, 'sourceProductId')
  sourceProduct: Product;

  @AllowNull(false)
  @Default(PRODUCT_OFFER_STATUSES.REVIEW)
  @Column
  status: number;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  comment: string;

  @AllowNull(true)
  @Column(DataTypes.FLOAT)
  addedRating: number;

  @HasMany(() => Notification, 'productOfferId')
  notifications: Notification[];

  @HasMany(() => Notification, 'productOfferId')
  unreadNotifications: Notification[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ProductOffer;
