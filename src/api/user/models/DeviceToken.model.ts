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
  AutoIncrement,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from './User.model';

@Table({
  tableName: 'DeviceToken',
})
class DeviceToken extends Model<DeviceToken> {
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

  @AllowNull(false)
  @Column(DataTypes.ENUM('android', 'ios'))
  platform: 'android' | 'ios';

  @AllowNull(false)
  @Column
  deviceId: string;

  @AllowNull(false)
  @Column
  token: string;

  @AllowNull(false)
  @Column
  active: boolean;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default DeviceToken;
