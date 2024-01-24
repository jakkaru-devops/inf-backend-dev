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
import User from '../../user/models/User.model';
import Product from './Product.model';
import AutoType from './AutoType.model';
import AutoBrand from './AutoBrand.model';
import AutoModel from './AutoModel.model';

@Table({
  tableName: 'ProductApplicability',
})
class ProductApplicability extends Model<ProductApplicability> {
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

  @ForeignKey(() => Product)
  @AllowNull(false)
  @Column
  productId: string;
  @BelongsTo(() => Product, 'productId')
  product: Product;

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

  @AllowNull(true)
  @Column
  autoBrandName: string;

  @ForeignKey(() => AutoModel)
  @AllowNull(true)
  @Column
  autoModelId: string;
  @BelongsTo(() => AutoModel, 'autoModelId')
  autoModel: AutoModel;

  @AllowNull(true)
  @Column
  autoModelName: string;

  @AllowNull(false)
  @Column
  article: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ProductApplicability;
