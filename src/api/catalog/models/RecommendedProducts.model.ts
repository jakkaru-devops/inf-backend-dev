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
  AutoIncrement,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Product from './Product.model';

@Table({
  tableName: 'RecommendedProducts',
})
class RecommendedProducts extends Model<RecommendedProducts> {
  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  productId: string;

  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  recommendedProductId: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default RecommendedProducts;
