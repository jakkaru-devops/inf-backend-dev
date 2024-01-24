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
  HasOne,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import AutoBrand from './AutoBrand.model';
import User from '../../user/models/User.model';
import AutoType from './AutoType.model';
import Product from './Product.model';
import ProductGroup from './ProductGroup.model';

@Table({
  tableName: 'ProductBranch',
})
class ProductBranch extends Model<ProductBranch> {
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

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product?: Product;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user: User;

  @ForeignKey(() => ProductBranch)
  @AllowNull(true)
  @Column
  sourceBranchId: string;
  @HasOne(() => ProductBranch, 'sourceBranchId')
  sourceBranch: ProductBranch;

  @AllowNull(false)
  @Column
  status: number;

  @AllowNull(false)
  @Column
  isMain: boolean;

  @AllowNull(true)
  @Column
  tag: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  description: string;

  @AllowNull(true)
  @Column
  manufacturer: string;

  @ForeignKey(() => AutoType)
  @AllowNull(true)
  @Column
  autoTypeId: string;
  @BelongsTo(() => AutoType, 'autoTypeId')
  autoType: AutoType;

  @ForeignKey(() => AutoBrand)
  @AllowNull(true)
  @Column
  autoBrandId: string;
  @BelongsTo(() => AutoBrand, 'autoBrandId')
  autoBrand: AutoBrand;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  autoModelIds: string;

  @AllowNull(true)
  @Column
  groupId: string;
  @BelongsTo(() => ProductGroup, 'groupId')
  group: ProductGroup;

  @AllowNull(true)
  @Column
  subgroupId: string;
  @BelongsTo(() => ProductGroup, 'subgroupId')
  subgroup: ProductGroup;

  @AllowNull(false)
  @Column
  article: string;

  @AllowNull(false)
  @Column
  articleSimplified: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ProductBranch;
