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
import ProductAutoModelRelations from './relations/ProductAutoModelRelations.model';
import Product from './Product.model';
import AutoType from './AutoType.model';
import AutoBrand from './AutoBrand.model';
import CatalogSection from './CatalogSection.model';
import ProductApplicability from './ProductApplicability.model';

@Table({
  tableName: 'AutoModel',
})
class AutoModel extends Model<AutoModel> {
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

  // @Unique // TODO: should be unique?
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
  @Column
  status: number;

  @AllowNull(false)
  @Default(false)
  @Column
  isHidden: boolean;

  @AllowNull(false)
  @ForeignKey(() => CatalogSection)
  @Column
  catalogSectionId: string;
  @BelongsTo(() => CatalogSection, 'catalogSectionId')
  catalogSection: CatalogSection;

  @AllowNull(false)
  @ForeignKey(() => AutoType)
  @Column
  autoTypeId: string;
  @BelongsTo(() => AutoType, 'autoTypeId')
  autoType: AutoType;

  @AllowNull(false)
  @ForeignKey(() => AutoBrand)
  @Column
  autoBrandId: string;
  @BelongsTo(() => AutoBrand, 'autoBrandId')
  autoBrand: AutoBrand;

  @AllowNull(true)
  @Column
  forSale: boolean;

  @BelongsToMany(() => Product, () => ProductAutoModelRelations, 'autoModelId', 'productId')
  products: Product[];

  @HasMany(() => ProductApplicability, 'autoModelId')
  applicabilities: ProductApplicability[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default AutoModel;
