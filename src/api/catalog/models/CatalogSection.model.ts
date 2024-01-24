import {
  AllowNull,
  AutoIncrement,
  BelongsToMany,
  Column,
  CreatedAt,
  Default,
  DeletedAt,
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
import Product from './Product.model';
import ProductSectionRelations from './relations/ProductSectionRelations.model';
import AutoBrand from './AutoBrand.model';
import AutoModel from './AutoModel.model';
import ProductGroup from './ProductGroup.model';

@Table({
  tableName: 'CatalogSection',
})
class CatalogSection extends Model<CatalogSection> {
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

  @HasMany(() => AutoType, 'catalogSectionId')
  autoTypes: AutoType[];

  @HasMany(() => AutoBrand, 'catalogSectionId')
  autoBrands: AutoBrand[];

  @HasMany(() => AutoModel, 'catalogSectionId')
  autoModels: AutoModel[];

  @HasMany(() => ProductGroup, 'catalogSectionId')
  productGroups: ProductGroup[];

  @BelongsToMany(() => Product, () => ProductSectionRelations, 'sectionId', 'productId')
  products: Product[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default CatalogSection;
