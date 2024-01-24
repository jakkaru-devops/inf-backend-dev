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
import AutoType from './AutoType.model';
import AutoTypeBrandRelations from './relations/AutoTypeBrandRelations.model';
import AutoModel from './AutoModel.model';
import Product from './Product.model';
import ProductAutoBrandRelations from './relations/ProductAutoBrandRelations.model';
import CatalogSection from './CatalogSection.model';
import SellerAutoBrands from './relations/SellerAutoBrands.model';
import DescribedProduct from './DescribedProduct.model';
import ProductGroup from './ProductGroup.model';
import AutoBrandGroupRelations from './relations/AutoBrandGroupRelations.model';
import ProductApplicability from './ProductApplicability.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import DescribedProductAutoBrands from './DescribedProductAutoBrands.model';
import ProductBranch from './ProductBranch.model';

@Table({
  tableName: 'AutoBrand',
})
class AutoBrand extends Model<AutoBrand> {
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

  // @AllowNull(false)
  // @Column
  // nameSimplified: string;

  @AllowNull(true)
  @Column(DataTypes.JSON)
  altNames: string[];

  @AllowNull(true)
  @Column
  name_en: string;

  @AllowNull(false)
  @Column
  status: number;

  @AllowNull(false)
  @Default(false)
  @Column
  isHidden: boolean;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  activeAutoTypeIds: string;

  @AllowNull(false)
  @ForeignKey(() => CatalogSection)
  @Column
  catalogSectionId: string;
  @BelongsTo(() => CatalogSection, 'catalogSectionId')
  catalogSection: CatalogSection;

  @AllowNull(true)
  @Column
  forSale: boolean;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  saleAutoTypeIds: string;

  @BelongsToMany(() => AutoType, () => AutoTypeBrandRelations, 'autoBrandId', 'autoTypeId')
  autoTypes: AutoType[];

  @HasMany(() => AutoModel, 'autoBrandId')
  autoModels: AutoModel[];

  @BelongsToMany(() => ProductGroup, () => AutoBrandGroupRelations, 'autoBrandId', 'productGroupId')
  productGroups: ProductGroup[];

  @BelongsToMany(() => Product, () => ProductAutoBrandRelations, 'autoBrandId', 'productId')
  products: Product[];

  @HasMany(() => DescribedProduct, 'autoBrandId')
  describedProducts: DescribedProduct[];

  @HasMany(() => SellerAutoBrands, 'autoBrandId')
  sellerAutoBrands: SellerAutoBrands[];

  @HasMany(() => DescribedProductAutoBrands, 'autoBrandId')
  describedProductAutoBrands: DescribedProductAutoBrands[];

  @HasMany(() => ProductApplicability, 'autoBrandId')
  applicabilities: ProductApplicability[];

  @HasMany(() => RequestProduct, 'autoBrandId')
  requestProducts: RequestProduct[];

  @HasMany(() => ProductBranch, 'autoBrandId')
  productBranches: ProductBranch[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default AutoBrand;
