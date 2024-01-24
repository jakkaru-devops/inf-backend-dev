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
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Address from '../../address/models/Address.model';
import Organization from '../../organization/models/Organization.model';
import StockBalance from './StockBalance.model';
import Sales from './Sales.model';
import User from '../../user/models/User.model';

@Table({
  tableName: 'Warehouse',
})
class Warehouse extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataTypes.UUIDV4)
  @Column
  id: string;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column
  organizationId: string;
  @BelongsTo(() => Organization, 'organizationId')
  organization?: Organization;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  sellerId: string;
  @BelongsTo(() => User, 'sellerId')
  seller?: User;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  addressId: string;
  @BelongsTo(() => Address, 'addressId')
  address?: Address;

  @HasMany(() => StockBalance, 'warehouseId')
  stockBalance: StockBalance[];

  @HasMany(() => Sales, 'warehouseId')
  sales: Sales[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Warehouse;
