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
  AutoIncrement,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Order from './Order.model';

@Table({
  tableName: 'ReasonToRejectShippingCondition',
})
class ReasonToRejectShippingCondition extends Model<ReasonToRejectShippingCondition> {
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

  @ForeignKey(() => Order)
  @AllowNull(true)
  @Column
  orderId: string;
  @BelongsTo(() => Order, 'orderId')
  order?: Order;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @Column
  reason: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ReasonToRejectShippingCondition;
