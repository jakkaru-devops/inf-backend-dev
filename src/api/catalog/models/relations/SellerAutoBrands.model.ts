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
import AutoBrand from '../AutoBrand.model';
import User from '../../../user/models/User.model';
import AutoType from '../AutoType.model';

@Table({
  tableName: 'SellerAutoBrands',
})
class SellerAutoBrands extends Model<SellerAutoBrands> {
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

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user: User;

  @ForeignKey(() => AutoType)
  @AllowNull(false)
  @Column
  autoTypeId: string;
  @BelongsTo(() => AutoType, 'autoTypeId')
  autoType: AutoType;

  @ForeignKey(() => AutoBrand)
  @AllowNull(false)
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

export default SellerAutoBrands;
