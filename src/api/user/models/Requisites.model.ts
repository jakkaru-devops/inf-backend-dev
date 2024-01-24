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
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Address from '../../address/models/Address.model';
import User from './User.model';

@Table({
  tableName: 'Requisites',
})
class Requisites extends Model<Requisites> {
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

  // Passport
  @AllowNull(true)
  @Column
  passportSeries: string;

  @AllowNull(true)
  @Column
  passportNumber: string;

  @AllowNull(true)
  @Column
  passportGiver: string;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  passportGettingDate: Date;

  @AllowNull(true)
  @Column
  passportLocationUnitCode: string;

  @AllowNull(true)
  @Column
  passportRegistrationAddress: string;
  // /Passport

  // Address
  @ForeignKey(() => Address)
  @AllowNull(true)
  @Column
  addressId: string;
  @BelongsTo(() => Address, 'addressId')
  address?: Address;

  @AllowNull(true)
  @Column
  inn: string;

  @AllowNull(true)
  @Column
  snils: string;

  @AllowNull(true)
  @Column
  bankName: string;

  @AllowNull(true)
  @Column
  bankInn: string;

  @AllowNull(true)
  @Column
  bankBik: string;

  @AllowNull(true)
  @Column
  bankKs: string;

  @AllowNull(true)
  @Column
  bankRs: string;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Requisites;
