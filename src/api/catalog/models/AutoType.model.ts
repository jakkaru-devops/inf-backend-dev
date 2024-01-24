import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  BelongsToMany,
  Column,
  CreatedAt,
  Default,
  DeletedAt,
  ForeignKey,
  HasMany,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import AutoBrand from './AutoBrand.model';
import Product from './Product.model';
import ProductAutoTypeRelations from './relations/ProductAutoTypeRelations.model';
import AutoModel from './AutoModel.model';
import CatalogSection from './CatalogSection.model';
import AutoTypeBrandRelations from './relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from './relations/AutoTypeGroupRelations.model';
import ProductGroup from './ProductGroup.model';
import SellerAutoBrands from './relations/SellerAutoBrands.model';
import ProductApplicability from './ProductApplicability.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import DescribedProductAutoBrands from './DescribedProductAutoBrands.model';
import ProductBranch from './ProductBranch.model';

@Table({
  tableName: 'AutoType',
})
class AutoType extends Model<AutoType> {
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

  // @AllowNull(false)
  // @Column
  // nameSimplified: string;

  @AllowNull(false)
  @ForeignKey(() => CatalogSection)
  @Column
  catalogSectionId: string;
  @BelongsTo(() => CatalogSection, 'catalogSectionId')
  catalogSection: CatalogSection;

  @AllowNull(false)
  @Column
  order: number;

  @AllowNull(true)
  @Column
  forSale: boolean;

  @BelongsToMany(() => AutoBrand, () => AutoTypeBrandRelations, 'autoTypeId', 'autoBrandId')
  autoBrands: AutoBrand[];

  @HasMany(() => AutoModel, 'autoTypeId')
  autoModels: AutoModel[];

  @BelongsToMany(() => ProductGroup, () => AutoTypeGroupRelations, 'autoTypeId', 'productGroupId')
  productGroups: ProductGroup[];

  @BelongsToMany(() => Product, () => ProductAutoTypeRelations, 'autoTypeId', 'productId')
  products: Product[];

  @HasMany(() => SellerAutoBrands, 'autoTypeId')
  sellerAutoBrands: SellerAutoBrands[];

  @HasMany(() => DescribedProductAutoBrands, 'autoTypeId')
  describedProductAutoBrands: DescribedProductAutoBrands[];

  @HasMany(() => ProductApplicability, 'autoTypeId')
  applicabilities: ProductApplicability[];

  @HasMany(() => RequestProduct, 'autoTypeId')
  requestProducts: RequestProduct[];

  @HasMany(() => ProductBranch, 'autoTypeId')
  productBranches: ProductBranch[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default AutoType;
