import {
  Table,
  Unique,
  Column,
  PrimaryKey,
  IsUUID,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
  Model,
  DeletedAt,
  BelongsTo,
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import DescribedProduct from './DescribedProduct.model';
import AutoType from './AutoType.model';
import AutoBrand from './AutoBrand.model';

@Table({
  tableName: 'DescribedProductAutoBrands',
})
class DescribedProductAutoBrands extends Model<DescribedProductAutoBrands> {
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

  @ForeignKey(() => DescribedProduct)
  @AllowNull(false)
  @Column
  describedProductId: string;
  @BelongsTo(() => DescribedProduct, 'describedProductId')
  describedProduct: DescribedProduct;

  @ForeignKey(() => AutoType)
  @AllowNull(true)
  @Column
  autoTypeId: string;
  @BelongsTo(() => AutoType, 'autoTypeId')
  autoType: AutoType;

  @ForeignKey(() => AutoBrand)
  @AllowNull(true)
  @Column
  autoBrandId: string;
  @BelongsTo(() => AutoBrand, 'autoBrandId')
  autoBrand: AutoBrand;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default DescribedProductAutoBrands;
