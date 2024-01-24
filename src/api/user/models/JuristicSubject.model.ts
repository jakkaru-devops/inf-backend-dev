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
  HasMany,
  BelongsToMany,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from './User.model';
import Address from '../../address/models/Address.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import CustomerContract from './CustomerContract.model';
import JuristicSubjectCustomer from './JuristicSubjectCustomer.model';

@Table({
  tableName: 'JuristicSubject',
})
class JuristicSubject extends Model<JuristicSubject> {
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
  creatorUserId: string;
  @BelongsTo(() => User, 'creatorUserId')
  creatorUser?: User;

  @AllowNull(true)
  @Column
  email: string;

  @ForeignKey(() => Address)
  @AllowNull(true)
  @Column
  juristicAddressId: string;
  @BelongsTo(() => Address, 'juristicAddressId')
  juristicAddress?: Address;

  @ForeignKey(() => Address)
  @AllowNull(true)
  @Column
  mailingAddressId: string;
  @BelongsTo(() => Address, 'mailingAddressId')
  mailingAddress?: Address;

  @AllowNull(false)
  @Column
  entityCode: string;

  // ИП, ООО и тд
  @AllowNull(true)
  @Column
  entityType: string;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  nameWithoutType: string;

  @AllowNull(false)
  @Column
  inn: string;

  @AllowNull(true)
  @Column
  kpp: string;

  @AllowNull(false)
  @Column
  ogrn: string;

  @AllowNull(false)
  @Column
  hasNds: boolean;

  @AllowNull(false)
  @Column
  bankName: string;

  @AllowNull(true)
  @Column
  bankInn: string;

  @AllowNull(false)
  @Column
  bankBik: string;

  @AllowNull(false)
  @Column
  bankKs: string;

  @AllowNull(false)
  @Column
  bankRs: string;

  @AllowNull(true)
  @Column
  path: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isSpecialClient: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  postponedPaymentAllowed: boolean;

  @HasMany(() => OrderRequest, 'payerId')
  orderRequests: OrderRequest[];

  @HasMany(() => JuristicSubjectCustomer, { foreignKey: 'juristicSubjectId', onDelete: 'CASCADE', hooks: true })
  customerRelations: JuristicSubjectCustomer[];

  @BelongsToMany(() => User, () => JuristicSubjectCustomer, 'juristicSubjectId', 'userId')
  customers: User[];

  @HasMany(() => CustomerContract, 'juristicSubjectId')
  customerContracts: CustomerContract[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  requestsNumber?: number;
  ordersNumber?: number;
  totalOrdersSum?: number;
  weeks?: any[];
}

export default JuristicSubject;
