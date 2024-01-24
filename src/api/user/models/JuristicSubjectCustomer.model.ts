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
  HasMany,
  DeletedAt,
  BelongsTo,
  AutoIncrement,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Order from '../../order/models/Order.model';
import JuristicSubject from './JuristicSubject.model';

@Table({
  tableName: 'JuristicSubjectCustomer',
})
class JuristicSubjectCustomer extends Model<JuristicSubjectCustomer> {
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

  @ForeignKey(() => JuristicSubject)
  @AllowNull(false)
  @Column
  juristicSubjectId: string;
  @BelongsTo(() => JuristicSubject, 'juristicSubjectId')
  juristicSubject?: JuristicSubject;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default JuristicSubjectCustomer;
