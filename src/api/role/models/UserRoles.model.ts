import {
  Table,
  Model,
  IsUUID,
  PrimaryKey,
  Unique,
  Default,
  Column,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  AllowNull,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Role from './Role.model';

@Table({
  tableName: 'UserRoles',
})
class UserRoles extends Model<UserRoles> {
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

  @ForeignKey(() => Role)
  @AllowNull(false)
  @Column
  roleId: string;
  @BelongsTo(() => Role, 'roleId')
  role: Role;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user: User;

  @AllowNull(true)
  @Column
  requestsBannedUntil: Date;

  @AllowNull(true)
  @Column
  bannedUntil: Date;

  @AllowNull(true)
  @Column(DataTypes.ARRAY(DataTypes.ENUM('spam', 'behaviour', 'fraud', 'nonobservance')))
  bannedReason: Array<'spam' | 'behaviour' | 'fraud' | 'nonobservance'>;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default UserRoles;
