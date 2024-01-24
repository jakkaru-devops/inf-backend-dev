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
import RefundExchangeRequest from './RefundExchangeRequest.model';

@Table({
  tableName: 'RefundExchangeRequestFile',
})
class RefundExchangeRequestFile extends Model<RefundExchangeRequestFile> {
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

  @ForeignKey(() => RefundExchangeRequest)
  @AllowNull(false)
  @Column
  refundExchangeRequestId: string;
  @BelongsTo(() => RefundExchangeRequest, 'refundExchangeRequestId')
  refundExchangeRequest?: RefundExchangeRequest;

  @ForeignKey(() => FileModel)
  @AllowNull(false)
  @Column
  fileId: string;
  @BelongsTo(() => FileModel, 'fileId')
  file?: FileModel;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default RefundExchangeRequestFile;
