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
import ChatMessage from './ChatMessage.model';

@Table({
  tableName: 'ChatMessageViews',
})
class ChatMessageView extends Model<ChatMessageView> {
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

  @ForeignKey(() => Chat)
  @AllowNull(false)
  @Column
  chatId: string;
  @BelongsTo(() => Chat, 'chatId')
  chat?: Chat;

  @ForeignKey(() => ChatMessage)
  @AllowNull(false)
  @Column
  chatMessageId: string;
  @BelongsTo(() => ChatMessage, 'chatMessageId')
  chatMessage?: ChatMessage;

  @AllowNull(false)
  @Default(false)
  @Column
  isViewed: boolean;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ChatMessageView;
