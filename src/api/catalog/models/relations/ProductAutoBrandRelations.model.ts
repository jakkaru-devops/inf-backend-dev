import { Table, Column, Model, AllowNull, ForeignKey } from 'sequelize-typescript';
import Product from '../Product.model';
import AutoBrand from '../AutoBrand.model';

@Table({
  tableName: 'ProductAutoBrandRelations',
})
class ProductAutoBrandRelations extends Model<ProductAutoBrandRelations> {
  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  productId: string;

  @AllowNull(false)
  @ForeignKey(() => AutoBrand)
  @Column
  autoBrandId: string;
}

export default ProductAutoBrandRelations;
