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
  AutoIncrement,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import TransportCompany from '../../shipping/models/TransportCompany';
import User from './User.model';

@Table({
  tableName: 'SellerTransportCompany',
})
class SellerTransportCompany extends Model<SellerTransportCompany> {
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
  sellerId: string;
  @BelongsTo(() => User, 'sellerId')
  seller?: User;

  @ForeignKey(() => TransportCompany)
  @AllowNull(false)
  @Column
  transportCompanyId: string;
  @BelongsTo(() => TransportCompany, 'transportCompanyId')
  transportCompany?: TransportCompany;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default SellerTransportCompany;
