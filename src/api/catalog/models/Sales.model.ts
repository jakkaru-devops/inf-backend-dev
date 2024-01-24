import {
  Table,
  Unique,
  Column,
  PrimaryKey,
  IsUUID,
  AllowNull,
  Default,
  Model,
  HasMany,
  AutoIncrement,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Warehouse from './Warehouse.model';
import Product from './Product.model';

@Table({
  tableName: 'Sales',
})
class Sales extends Model<Sales> {
  @IsUUID(4)
  @PrimaryKey
  @Unique
  @Default(DataTypes.UUIDV4)
  @Column
  id: string;

  @Unique
  @AutoIncrement
  @Column
  idInt?: number;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Column
  warehouseId: string;
  @BelongsTo(() => Warehouse, 'warehouseId')
  warehouse?: Warehouse;

  @AllowNull(false)
  @Column
  productId: string;

  @AllowNull(false)
  @Column(DataTypes.DOUBLE)
  price: number;

  @AllowNull(false)
  @Column
  amount: number;

  @AllowNull(false)
  @Column
  intervalStart: Date;

  @AllowNull(false)
  @Column
  intervalEnd: Date;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Sales;
