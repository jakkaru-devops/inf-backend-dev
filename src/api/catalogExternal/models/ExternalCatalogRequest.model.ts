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

@Table({
  tableName: 'ExternalCatalogRequest',
})
class ExternalCatalogRequest extends Model {
  @PrimaryKey
  @Unique
  @AutoIncrement
  @Column
  id?: number;

  @AllowNull(false)
  @Column
  ip: string;

  @AllowNull(false)
  @Column
  path: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ExternalCatalogRequest;
