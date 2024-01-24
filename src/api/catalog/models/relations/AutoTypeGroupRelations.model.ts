import { Table, Column, Model, ForeignKey, AllowNull } from 'sequelize-typescript';
import AutoBrand from '../AutoBrand.model';
import AutoType from '../AutoType.model';
import ProductGroup from '../ProductGroup.model';

@Table({
  tableName: 'AutoTypeGroupRelations',
})
class AutoTypeGroupRelations extends Model<AutoTypeGroupRelations> {
  @AllowNull(false)
  @ForeignKey(() => AutoType)
  @Column
  autoTypeId: string;

  @AllowNull(false)
  @ForeignKey(() => ProductGroup)
  @Column
  productGroupId: string;
}

export default AutoTypeGroupRelations;
