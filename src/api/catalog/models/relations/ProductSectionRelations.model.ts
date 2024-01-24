import { Table, Column, Model, AllowNull, ForeignKey } from 'sequelize-typescript';
import Product from '../Product.model';
import CatalogSection from '../CatalogSection.model';

@Table({
  tableName: 'ProductSectionRelations',
})
class ProductSectionRelations extends Model<ProductSectionRelations> {
  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  productId: string;

  @AllowNull(false)
  @ForeignKey(() => CatalogSection)
  @Column
  sectionId: string;
}

export default ProductSectionRelations;
