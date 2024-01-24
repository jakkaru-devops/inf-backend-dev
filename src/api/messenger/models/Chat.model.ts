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
  HasOne,
  BelongsTo,
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import ChatMember from './ChatMember.model';
import ChatMessage from './ChatMessage.model';
import ChatMessageView from './ChatMessageView.model';

@Table({
  tableName: 'Chats',
})
class Chat extends Model<Chat> {
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
  authorId: string;
  @BelongsTo(() => User, 'authorId')
  author?: User;

  @AllowNull(true)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  type: number;

  @AllowNull(false)
  @Default(DataTypes.NOW)
  @Column
  lastMessageCreatedAt: Date;

  @HasMany(() => ChatMember, 'chatId')
  members: ChatMember[];

  @HasMany(() => ChatMember, 'chatId')
  membersRequired: ChatMember[];

  @HasOne(() => ChatMember, { foreignKey: 'chatId', onDelete: 'CASCADE', hooks: true })
  companion: ChatMember;

  @HasOne(() => ChatMessage, { foreignKey: 'chatId', onDelete: 'CASCADE', hooks: true })
  lastMessage: ChatMessage;

  @HasMany(() => ChatMessage, 'chatId')
  messages: ChatMessage[];

  @HasMany(() => ChatMessage, 'chatId')
  messagesRequired: ChatMessage[];

  @HasMany(() => ChatMessage, 'chatId')
  unreadMessages: ChatMessage[];

  @HasMany(() => ChatMessageView, 'chatId')
  messageViews: ChatMessageView[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Chat;
