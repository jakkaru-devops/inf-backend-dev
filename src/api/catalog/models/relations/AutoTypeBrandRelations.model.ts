import { Table, Column, Model, ForeignKey, AllowNull } from 'sequelize-typescript';
import AutoBrand from '../AutoBrand.model';
import AutoType from '../AutoType.model';

@Table({
  tableName: 'AutoTypeBrandRelations',
})
class AutoTypeBrandRelations extends Model<AutoTypeBrandRelations> {
  @AllowNull(false)
  @ForeignKey(() => AutoType)
  @Column
  autoTypeId: string;

  @AllowNull(false)
  @ForeignKey(() => AutoBrand)
  @Column
  autoBrandId: string;
}

export default AutoTypeBrandRelations;
