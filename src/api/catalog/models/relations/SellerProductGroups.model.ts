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
import User from '../../../user/models/User.model';
import ProductGroup from '../ProductGroup.model';

@Table({
  tableName: 'SellerProductGroups',
})
class SellerProductGroups extends Model<SellerProductGroups> {
  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;

  @ForeignKey(() => ProductGroup)
  @AllowNull(false)
  @Column
  productGroupId: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default SellerProductGroups;
