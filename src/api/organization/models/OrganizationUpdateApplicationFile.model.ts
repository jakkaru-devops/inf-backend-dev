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
import Organization from './Organization.model';
import OrganizationUpdateApplication from './OrganizationUpdateApplication.model';

@Table({
  tableName: 'OrganizationUpdateApplicationFile',
})
class OrganizationUpdateApplicationFile extends Model<OrganizationUpdateApplicationFile> {
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

  @ForeignKey(() => OrganizationUpdateApplication)
  @AllowNull(false)
  @Column
  applicationId: string;
  @BelongsTo(() => OrganizationUpdateApplication, 'applicationId')
  application?: OrganizationUpdateApplication;

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

export default OrganizationUpdateApplicationFile;
