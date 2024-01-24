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
import Complaint from './Complaint.model';

@Table({
  tableName: 'ComplaintFile',
})
class ComplaintFile extends Model<ComplaintFile> {
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

  @ForeignKey(() => Complaint)
  @AllowNull(false)
  @Column
  complaintId: string;
  @BelongsTo(() => Complaint, 'complaintId')
  complaint?: Complaint;

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

export default ComplaintFile;
