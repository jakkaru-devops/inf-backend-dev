import { Table, Column, Model, AllowNull, ForeignKey } from 'sequelize-typescript';
import Product from '../Product.model';
import AutoType from '../AutoType.model';

@Table({
  tableName: 'ProductAutoTypeRelations',
})
class ProductAutoTypeRelations extends Model<ProductAutoTypeRelations> {
  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  productId: string;

  @AllowNull(false)
  @ForeignKey(() => AutoType)
  @Column
  autoTypeId: string;
}

export default ProductAutoTypeRelations;
