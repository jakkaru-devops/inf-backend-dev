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
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from './User.model';
import FileModel from '../../files/models/File.model';
import CustomerContract from './CustomerContract.model';

@Table({
  tableName: 'CustomerContractSpecification',
})
class CustomerContractSpecification extends Model {
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

  @ForeignKey(() => CustomerContract)
  @AllowNull(false)
  @Column
  contractId: string;
  @BelongsTo(() => CustomerContract, 'contractId')
  contract?: CustomerContract;

  @AllowNull(false)
  @Column
  orderRequestId: string;

  @AllowNull(false)
  @Column
  orderId: string;

  @ForeignKey(() => FileModel)
  @AllowNull(false)
  @Column
  fileId: string;
  @BelongsTo(() => FileModel, 'fileId')
  file?: FileModel;

  @AllowNull(false)
  @Column
  name: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default CustomerContractSpecification;
