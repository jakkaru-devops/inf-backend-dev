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
  HasOne,
  AutoIncrement,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import FavoriteProduct from './FavoriteProduct.model';
import ProductFile from './ProductFile.model';
import ProductOffer from './ProductOffer.model';
import ProductAnalogs from './ProductAnalogs.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import CatalogSection from './CatalogSection.model';
import ProductSectionRelations from './relations/ProductSectionRelations.model';
import AutoType from './AutoType.model';
import ProductAutoTypeRelations from './relations/ProductAutoTypeRelations.model';
import ProductAutoBrandRelations from './relations/ProductAutoBrandRelations.model';
import AutoBrand from './AutoBrand.model';
import AutoModel from './AutoModel.model';
import ProductAutoModelRelations from './relations/ProductAutoModelRelations.model';
import ProductGroup from './ProductGroup.model';
import ProductGroupRelations from './relations/ProductGroupRelations.model';
import CartProduct from '../../cart/models/CartProduct.model';
import RecommendedProducts from './RecommendedProducts.model';
import ProductApplicability from './ProductApplicability.model';
import ProductBranch from './ProductBranch.model';
import StockBalance from './StockBalance.model';
import User from '../../user/models/User.model';
import { Sale } from './Sale.model';

@Table({
  tableName: 'Product',
})
class Product extends Model<Product> {
  @IsUUID(4)
  @PrimaryKey
  @Default(DataTypes.UUIDV4)
  @Column
  id: string;

  @Unique
  @AutoIncrement
  @Column
  idInt?: number;

  @AllowNull(false)
  @Column
  article: string; // Main article

  @AllowNull(false)
  @Column
  articleSimplified: string; // Article for search requests

  @AllowNull(true)
  @Column(DataTypes.JSON)
  additionalArticles: string[];

  @AllowNull(true)
  @Column
  code: string; // For product added at the project lifecycle start

  @AllowNull(false)
  @Column
  name_ru: string;

  @AllowNull(true)
  @Column
  pureName: string;

  @AllowNull(false)
  @Column
  nameSimplified: string; // Name for search requests

  @AllowNull(true)
  @Column
  name_en: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  description_ru: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  description_en: string;

  @AllowNull(true)
  @Column
  manufacturer: string;

  @AllowNull(false)
  @Column
  status: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  weight: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  length: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  width: number;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  height: number;

  @AllowNull(true)
  @Column(DataTypes.JSON)
  params: object; // additional params

  @AllowNull(true)
  @Column
  previewFileId: string;

  @AllowNull(true)
  @Column
  acatProductId: string;

  @AllowNull(true)
  @Column
  laximoProductId: string;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  autoTypeIds: string;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  autoBrandIds: string;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  autoModelIds: string;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  groupIds: string;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  subgroupIds: string;

  @AllowNull(false)
  @Default(false)
  @Column
  hasApplicabilities: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  hasAnalogs: boolean;

  @Default(false)
  @Column
  isExternalProduct: boolean;

  @AllowNull(true)
  @Column(DataTypes.JSON)
  originalTree: any;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  tagsJson: string;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  branchCategoriesJson: string;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  minPrice: number;

  /** Used to get prices of child products */
  @AllowNull(true)
  @Column
  mainProductId: string;

  /** Id of product the entity is copied from */
  @AllowNull(true)
  @Column
  sourceProductId: string;

  /** Creator user id */
  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @BelongsToMany(() => CatalogSection, () => ProductSectionRelations, 'productId', 'sectionId')
  catalogSections: CatalogSection[];

  @BelongsToMany(() => AutoType, () => ProductAutoTypeRelations, 'productId', 'autoTypeId')
  autoTypes: AutoType[];

  @BelongsToMany(() => AutoBrand, () => ProductAutoBrandRelations, 'productId', 'autoBrandId')
  autoBrands: AutoBrand[];

  @BelongsToMany(() => AutoModel, () => ProductAutoModelRelations, 'productId', 'autoModelId')
  autoModels: AutoModel[];

  @BelongsToMany(() => ProductGroup, () => ProductGroupRelations, 'productId', 'productGroupId')
  groups: ProductGroup[];

  @BelongsToMany(() => ProductGroup, () => ProductGroupRelations, 'productId', 'productGroupId')
  subgroups: ProductGroup[];

  @HasMany(() => RequestProduct, 'productId')
  requestProduct: RequestProduct[];

  @HasMany(() => FavoriteProduct, 'productId')
  favoriteProducts: FavoriteProduct[];

  @HasMany(() => CartProduct, 'productId')
  cartProducts: CartProduct[];

  @BelongsToMany(() => Product, () => ProductAnalogs, 'productId', 'analogId')
  analogs: Product[];

  @BelongsToMany(() => Product, () => RecommendedProducts, 'productId', 'recommendedProductId')
  recommendedProducts: Product[];

  @HasMany(() => ProductApplicability, 'productId')
  applicabilities: ProductApplicability[];

  @HasMany(() => ProductFile, 'productId')
  productFiles: ProductFile[];

  @HasOne(() => ProductOffer, 'productId')
  productOffer: ProductOffer;

  @HasMany(() => ProductOffer, 'sourceProductId')
  productOffers: ProductOffer[];

  @HasOne(() => ProductBranch, 'productId')
  branch: ProductBranch;

  @HasMany(() => ProductBranch, 'productId')
  branches: ProductBranch[];

  @HasMany(() => StockBalance, 'productId')
  stockBalances: StockBalance[];

  @HasOne(() => StockBalance, 'productId')
  priceOffer: StockBalance;

  @HasOne(() => Sale, 'productId')
  sale: Sale;

  @HasMany(() => Sale, 'productId')
  sales: Sale[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  public name?: string;
  public categories?: {
    autoType: AutoType;
    autoBrand: AutoBrand;
    autoModels: AutoModel[];
    group: ProductGroup;
    subgroup: ProductGroup;
  };
}

export default Product;
