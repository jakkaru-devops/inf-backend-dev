import { Table, Column, Model, AllowNull, ForeignKey } from 'sequelize-typescript';
import Product from '../Product.model';
import ProductGroup from '../ProductGroup.model';

@Table({
  tableName: 'ProductGroupRelations',
})
class ProductGroupRelations extends Model<ProductGroupRelations> {
  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  productId: string;

  @AllowNull(false)
  @ForeignKey(() => ProductGroup)
  @Column
  productGroupId: string;
}

export default ProductGroupRelations;
