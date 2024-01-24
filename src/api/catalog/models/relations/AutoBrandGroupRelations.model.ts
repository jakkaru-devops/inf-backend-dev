import { Table, Column, Model, ForeignKey, AllowNull } from 'sequelize-typescript';
import AutoBrand from '../AutoBrand.model';
import AutoType from '../AutoType.model';
import ProductGroup from '../ProductGroup.model';

@Table({
  tableName: 'AutoBrandGroupRelations',
})
class AutoBrandGroupRelations extends Model<AutoBrandGroupRelations> {
  @AllowNull(false)
  @ForeignKey(() => AutoBrand)
  @Column
  autoBrandId: string;

  @AllowNull(false)
  @ForeignKey(() => ProductGroup)
  @Column
  productGroupId: string;
}

export default AutoBrandGroupRelations;
