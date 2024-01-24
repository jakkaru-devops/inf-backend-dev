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
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import ProductGroupRelations from './relations/ProductGroupRelations.model';
import Product from './Product.model';
import CatalogSection from './CatalogSection.model';
import AutoType from './AutoType.model';
import AutoTypeGroupRelations from './relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from './relations/AutoBrandGroupRelations.model';
import AutoBrand from './AutoBrand.model';
import User from '../../user/models/User.model';
import SellerProductGroups from './relations/SellerProductGroups.model';
import DescribedProduct from './DescribedProduct.model';
import ProductBranch from './ProductBranch.model';

@Table({
  tableName: 'ProductGroup',
})
class ProductGroup extends Model<ProductGroup> {
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

  @AllowNull(false)
  @Column
  label: string;

  @AllowNull(false)
  @Column
  name_ru: string;

  @AllowNull(true)
  @Column
  name_en?: string;

  // @AllowNull(false)
  // @Column
  // nameSimplified: string;

  @AllowNull(false)
  @Column
  status: number;

  @AllowNull(false)
  @Default(false)
  @Column
  isHidden: boolean;

  @AllowNull(false)
  @Column
  nestingLevel: number;

  @AllowNull(true)
  @ForeignKey(() => ProductGroup)
  @Column
  parentId?: string;
  @BelongsTo(() => ProductGroup, 'parentId')
  parent?: ProductGroup;

  @AllowNull(false)
  @ForeignKey(() => CatalogSection)
  @Column
  catalogSectionId: string;
  @BelongsTo(() => CatalogSection, 'catalogSectionId')
  catalogSection: CatalogSection;

  @AllowNull(false)
  @Column(DataTypes.ENUM('AUTO_PARTS', 'AUTO_PRODUCTS', 'AUTO_TOOLS'))
  catalog: 'AUTO_PARTS' | 'AUTO_PRODUCTS' | 'AUTO_TOOLS';

  @AllowNull(true)
  @Column
  order: number;

  @AllowNull(false)
  @Default('[]')
  @Column(DataTypes.TEXT)
  activeAutoTypeIds: string;

  @AllowNull(false)
  @Default('[]')
  @Column(DataTypes.TEXT)
  activeAutoBrandIds: string;

  @AllowNull(true)
  @Column
  forSale: boolean;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  saleAutoTypeIds: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  saleAutoBrandIds: string;

  @HasMany(() => ProductGroup, 'parentId')
  children: ProductGroup[];

  @BelongsToMany(() => AutoType, () => AutoTypeGroupRelations, 'productGroupId', 'autoTypeId')
  autoTypes: AutoType[];

  @BelongsToMany(() => AutoBrand, () => AutoBrandGroupRelations, 'productGroupId', 'autoBrandId')
  autoBrands: AutoBrand[];

  @BelongsToMany(() => Product, () => ProductGroupRelations, 'productGroupId', 'productId')
  products: Product[];

  @HasMany(() => DescribedProduct, 'productGroupId')
  describedProducts: DescribedProduct[];

  @BelongsToMany(() => User, () => SellerProductGroups, 'productGroupId', 'userId')
  sellers: User[];

  @HasMany(() => ProductBranch, 'groupId')
  productBranchesByGroupId: ProductBranch[];

  @HasMany(() => ProductBranch, 'subgroupId')
  productBranchesBySubgroupId: ProductBranch[];
}

export default ProductGroup;
