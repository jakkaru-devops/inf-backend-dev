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
import FileModel from '../../files/models/File.model';
import OrderRequest from './OrderRequest.model';
import Order from './Order.model';

@Table({
  tableName: 'OrderRequestFile',
})
class OrderRequestFile extends Model<OrderRequestFile> {
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

  @ForeignKey(() => Order)
  @AllowNull(true)
  @Column
  orderId: string;
  @BelongsTo(() => Order, 'orderId')
  order?: Order;

  @AllowNull(false)
  @Default('attachment')
  @Column(
    DataTypes.ENUM(
      'attachment',
      'invoice',
      'accountingDocument',
      'acceptanceCertificate',
      'waybill',
      'check',
      'specification',
    ),
  )
  group:
    | 'attachment'
    | 'invoice'
    | 'accountingDocument'
    | 'acceptanceCertificate'
    | 'waybill'
    | 'check'
    | 'specification';

  @ForeignKey(() => FileModel)
  @AllowNull(false)
  @Column
  fileId: string;
  @BelongsTo(() => FileModel, 'fileId')
  file?: FileModel;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrderRequestFile;
