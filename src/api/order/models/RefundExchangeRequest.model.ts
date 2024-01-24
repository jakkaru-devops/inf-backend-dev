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
import RefundExchangeRequestFile from './RefundExchangeRequestFile.model';
import RequestProduct from './RequestProduct.model';
import User from '../../user/models/User.model';
import Order from './Order.model';

@Table({
  tableName: 'RefundExchangeRequest',
})
class RefundExchangeRequest extends Model<RefundExchangeRequest> {
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
  customerId: string;
  @BelongsTo(() => User, 'customerId')
  customer?: User;

  @AllowNull(false)
  @Column
  orderedQuantity: number;

  @AllowNull(false)
  @Column
  quantity: number;

  @AllowNull(false)
  @Column(
    DataTypes.ARRAY(
      DataTypes.ENUM(
        'poorQuality',
        'deliveryTimesViolated',
        'inadequateSet',
        'notCorrespond',
        'notFit',
        'orderingMistake',
        'other',
      ),
    ),
  )
  reason: (
    | 'poorQuality'
    | 'deliveryTimesViolated'
    | 'inadequateSet'
    | 'notCorrespond'
    | 'notFit'
    | 'orderingMistake'
    | 'other'
  )[];

  @AllowNull(false)
  @Column(DataTypes.ENUM('REFUND', 'EXCHANGE'))
  disputeResolution: 'REFUND' | 'EXCHANGE';

  @AllowNull(false)
  @Default('PENDING')
  @Column(DataTypes.ENUM('PENDING', 'AGREED', 'RESOLVED', 'CLOSED'))
  status: 'PENDING' | 'AGREED' | 'RESOLVED' | 'CLOSED';

  @Default(false)
  @Column
  isRejected: boolean;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  comment: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  reply: string;

  @ForeignKey(() => Order)
  @AllowNull(false)
  @Column
  orderId: string;
  @BelongsTo(() => Order, 'orderId')
  order?: Order;

  @ForeignKey(() => RequestProduct)
  @AllowNull(true)
  @Column
  requestProductId: string;
  @BelongsTo(() => RequestProduct, 'requestProductId')
  requestProduct?: RequestProduct;

  @HasMany(() => RefundExchangeRequestFile, 'refundExchangeRequestId')
  refundExchangeRequestFiles: RefundExchangeRequestFile[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default RefundExchangeRequest;
