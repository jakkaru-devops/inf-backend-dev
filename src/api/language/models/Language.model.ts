import {
  Table,
  Unique,
  Column,
  PrimaryKey,
  CreatedAt,
  UpdatedAt,
  Model,
  AutoIncrement,
  DeletedAt,
  IsUUID,
  Default,
  AllowNull,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';

@Table({
  tableName: 'Language',
})
class Language extends Model<Language> {
  @IsUUID(4)
  @PrimaryKey
  @Unique
  @Default(DataTypes.UUIDV4)
  @Column
  id?: string;

  @Unique
  @AutoIncrement
  @AllowNull(false)
  @Column
  idInt?: number;

  @Unique
  @AllowNull(false)
  @Column
  label: string;

  @AllowNull(false)
  @Column
  name_ru: string;

  @AllowNull(true)
  @Column
  name_en: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Language;
