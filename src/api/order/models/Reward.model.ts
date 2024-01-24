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
  tableName: 'Reward',
})
class Reward extends Model<Reward> {
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

  @AllowNull(true)
  @Column({
    type: DataTypes.DOUBLE,
  })
  amount: number;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  sellerId: string;
  @BelongsTo(() => User, 'sellerId')
  seller?: User;

  @ForeignKey(() => Order)
  @AllowNull(true)
  @Unique
  @Column
  orderId: string;
  @BelongsTo(() => Order, 'orderId')
  order?: Order;

  @Default(false)
  @Column
  supplierPaid: boolean;

  @AllowNull(true)
  @Column
  givenAtMonth: string;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  givenAt: Date;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  sellerFeePaidAt: Date;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Reward;
