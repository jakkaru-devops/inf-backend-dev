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
  tableName: 'ExternalCatalogBannedIP',
})
class ExternalCatalogBannedIP extends Model {
  @PrimaryKey
  @Unique
  @AutoIncrement
  @Column
  id?: number;

  @AllowNull(false)
  @Unique
  @Column
  ip: string;

  @AllowNull(false)
  @Column
  banExpiresAt: Date;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ExternalCatalogBannedIP;
