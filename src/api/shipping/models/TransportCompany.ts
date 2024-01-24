import {
  Table,
  Model,
  IsUUID,
  PrimaryKey,
  Unique,
  Default,
  Column,
  AutoIncrement,
  HasMany,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
  AllowNull,
  BelongsToMany,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Order from '../../order/models/Order.model';
import SellerTransportCompany from '../../user/models/SellerTransportCompany.model';
import User from '../../user/models/User.model';

@Table({
  tableName: 'TransportCompany',
})
class TransportCompany extends Model<TransportCompany> {
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

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Unique
  @Column
  label: string;

  @AllowNull(false)
  @Column
  site: string;

  @AllowNull(false)
  @Column
  logoUrl: string;

  @AllowNull(true)
  @Column({
    type: DataTypes.DOUBLE,
  })
  price: number;

  @AllowNull(true)
  @Column
  calculateUrl: string;

  @AllowNull(true)
  @Column
  deliveryTerm: number; // дней

  @BelongsToMany(() => User, () => SellerTransportCompany, 'transportCompanyId', 'sellerId')
  sellers: User[];

  @HasMany(() => Order, 'transportCompanyId')
  orders: Order[];

  @HasMany(() => SellerTransportCompany, 'transportCompanyId')
  sellerTransportCompanies: SellerTransportCompany[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default TransportCompany;
