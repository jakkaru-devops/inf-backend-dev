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
  AutoIncrement,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Order from './Order.model';
import OrderRequest from './OrderRequest.model';

@Table({
  tableName: 'OrderRequestSellerData',
})
class OrderRequestSellerData extends Model<OrderRequestSellerData> {
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

  @ForeignKey(() => OrderRequest)
  @AllowNull(true)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest?: OrderRequest;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  sellerId: string;
  @BelongsTo(() => User, 'sellerId')
  seller?: User;

  @AllowNull(false)
  @Column
  productsNumber: number;

  @AllowNull(false)
  @Column
  describedProductsNumber: number;

  @AllowNull(false)
  @Default('[]')
  @Column(DataTypes.TEXT)
  productIds: string;

  @AllowNull(false)
  @Column
  lastNotificationCreatedAt: Date;

  @AllowNull(false)
  @Column
  sellerStatus: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrderRequestSellerData;
