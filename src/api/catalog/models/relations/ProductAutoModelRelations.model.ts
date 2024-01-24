import { Table, Column, Model, AllowNull, ForeignKey } from 'sequelize-typescript';
import Product from '../Product.model';
import AutoModel from '../AutoModel.model';

@Table({
  tableName: 'ProductAutoModelRelations',
})
class ProductAutoModelRelations extends Model<ProductAutoModelRelations> {
  @AllowNull(false)
  @ForeignKey(() => Product)
  @Column
  productId: string;

  @AllowNull(false)
  @ForeignKey(() => AutoModel)
  @Column
  autoModelId: string;
}

export default ProductAutoModelRelations;
