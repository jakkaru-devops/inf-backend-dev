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
import FileModel from './File.model';

@Table({
  tableName: 'CustomerRegisterFile',
})
class CustomerRegisterFile extends Model<CustomerRegisterFile> {
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

  @ForeignKey(() => FileModel)
  @AllowNull(false)
  @Column
  fileId: string;
  @BelongsTo(() => FileModel, 'fileId')
  file?: FileModel;

  @AllowNull(false)
  @Column
  label: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default CustomerRegisterFile;
