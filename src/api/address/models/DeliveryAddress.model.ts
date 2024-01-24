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
  ForeignKey,
  BelongsTo,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Address from './Address.model';

@Table({
  tableName: 'DeliveryAddress',
})
class DeliveryAddress extends Model {
  @IsUUID(4)
  @PrimaryKey
  @Unique
  @Default(DataTypes.UUIDV4)
  @Column
  id?: string;

  @Unique
  @AutoIncrement
  @Column
  idInt?: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  addressId: string;
  @BelongsTo(() => Address, 'addressId')
  address?: Address;

  @AllowNull(false)
  @Default(false)
  @Column
  isDefault: boolean;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default DeliveryAddress;
