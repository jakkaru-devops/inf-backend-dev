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
import RefundExchangeRequestFile from './RefundExchangeRequestFile.model';
import RequestProduct from './RequestProduct.model';
import User from '../../user/models/User.model';
import OrderRequest from './OrderRequest.model';

@Table({
  tableName: 'PaymentRefundRequest',
})
class PaymentRefundRequest extends Model<PaymentRefundRequest> {
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
  @AllowNull(false)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest?: OrderRequest;

  @AllowNull(true)
  @Column
  refundSum: number;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default PaymentRefundRequest;
