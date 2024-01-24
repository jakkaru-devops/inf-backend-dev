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
import RequestProduct from '../../order/models/RequestProduct.model';
import DescribedProductFile from './DescribedProductFile.model';
import AutoBrand from './AutoBrand.model';
import ProductGroup from './ProductGroup.model';
import DescribedProductAutoBrands from './DescribedProductAutoBrands.model';

@Table({
  tableName: 'DescribedProduct',
})
class DescribedProduct extends Model<DescribedProduct> {
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

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  description: string;

  @AllowNull(true)
  @ForeignKey(() => AutoBrand)
  @Column
  autoBrandId: string;
  @BelongsTo(() => AutoBrand, 'autoBrandId')
  autoBrand: AutoBrand;

  @AllowNull(true)
  @ForeignKey(() => ProductGroup)
  @Column
  productGroupId: string;
  @BelongsTo(() => ProductGroup, 'productGroupId')
  productGroup: ProductGroup;

  @AllowNull(true)
  @Column(DataTypes.JSON)
  productGroupIds: string[];

  @HasMany(() => DescribedProductFile, 'describedProductId')
  productFiles: DescribedProductFile[];

  @HasMany(() => RequestProduct, 'describedProductId')
  requestProduct: RequestProduct;

  @HasMany(() => DescribedProductAutoBrands, 'describedProductId')
  autoBrandsData: DescribedProductAutoBrands[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default DescribedProduct;
