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
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Chat from './Chat.model';
import Role from '../../role/models/Role.model';

@Table({
  tableName: 'ChatMembers',
})
class ChatMember extends Model<ChatMember> {
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

  @ForeignKey(() => Role)
  @AllowNull(false)
  @Column
  roleId: string;
  @BelongsTo(() => Role, 'roleId')
  role?: User;

  @ForeignKey(() => Chat)
  @AllowNull(false)
  @Column
  chatId: string;
  @BelongsTo(() => Chat, 'chatId')
  chat?: Chat;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ChatMember;
