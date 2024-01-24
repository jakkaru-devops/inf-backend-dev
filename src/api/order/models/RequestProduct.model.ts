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
  HasOne,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  HasMany,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Order from './Order.model';
import Product from '../../catalog/models/Product.model';
import OrderRequest from './OrderRequest.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import RefundExchangeRequest from './RefundExchangeRequest.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import AutoType from '../../catalog/models/AutoType.model';

@Table({
  tableName: 'RequestProduct',
})
class RequestProduct extends Model<RequestProduct> {
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

  @Default(false)
  @Column
  isSelected: boolean;

  @AllowNull(true)
  @Column
  quantity: number;

  @AllowNull(true)
  @Column
  count: number;

  @AllowNull(true)
  @Column({
    type: DataTypes.DOUBLE,
  })
  unitPrice: number;

  @AllowNull(true)
  @Column
  deliveryQuantity: number; // кол-во под заказ

  @AllowNull(true)
  @Column
  deliveryTerm: number; // дней

  @ForeignKey(() => Product)
  @AllowNull(true)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product?: Product;

  @ForeignKey(() => DescribedProduct)
  @AllowNull(true)
  @Column
  describedProductId: string;
  @BelongsTo(() => DescribedProduct, 'describedProductId')
  describedProduct?: DescribedProduct;

  @AllowNull(true)
  @Column
  requestedProductId: string;

  @ForeignKey(() => Order)
  @AllowNull(true)
  @Column
  orderId: string;
  @BelongsTo(() => Order, 'orderId')
  order?: Order;

  @ForeignKey(() => OrderRequest)
  @AllowNull(true)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest?: OrderRequest;

  @ForeignKey(() => AutoType)
  @AllowNull(true)
  @Column
  autoTypeId: string;
  @BelongsTo(() => AutoType, 'autoTypeId')
  autoType?: AutoType;

  @ForeignKey(() => AutoBrand)
  @AllowNull(true)
  @Column
  autoBrandId: string;
  @BelongsTo(() => AutoBrand, 'autoBrandId')
  autoBrand?: AutoBrand;

  @AllowNull(true)
  @Column
  altName: string;

  @AllowNull(true)
  @Column
  altManufacturer: string;

  @AllowNull(true)
  @Column
  altArticle: string;

  // For cases when catalog product is deleted
  @AllowNull(true)
  @Column
  reserveName: string;

  @AllowNull(true)
  @Column
  reserveManufacturer: string;

  @AllowNull(true)
  @Column
  reserveArticle: string;

  @AllowNull(true)
  @Column
  priceOfferId: number;

  @AllowNull(true)
  @Column
  transferedQuantity: number;

  @HasOne(() => RefundExchangeRequest, 'requestProductId')
  refundExchangeRequest: RefundExchangeRequest;

  @HasMany(() => RefundExchangeRequest, 'requestProductId')
  refundExchangeRequests: RefundExchangeRequest[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default RequestProduct;
