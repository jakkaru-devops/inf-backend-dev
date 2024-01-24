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
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Chat from './Chat.model';
import ChatMessageFile from './ChatMessageFile.model';
import ChatMessageView from './ChatMessageView.model';
import Role from '../../role/models/Role.model';
import OrderRequest from '../../order/models/OrderRequest.model';

@Table({
  tableName: 'ChatMessages',
})
class ChatMessage extends Model<ChatMessage> {
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

  @ForeignKey(() => Role)
  @AllowNull(false)
  @Column
  authorRoleId: string;
  @BelongsTo(() => Role, 'authorRoleId')
  authorRole?: Role;

  @ForeignKey(() => Chat)
  @AllowNull(false)
  @Column
  chatId: string;
  @BelongsTo(() => Chat, 'chatId')
  chat: Chat;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  text: string;

  @Default(true)
  @Column
  isUnread: boolean;

  @AllowNull(true)
  @Column({
    type: DataTypes.JSON,
  })
  params?: any;

  @ForeignKey(() => OrderRequest)
  @AllowNull(true)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest?: OrderRequest;

  @ForeignKey(() => ChatMessage)
  @AllowNull(true)
  @Column
  repliedMessageId: string;
  @BelongsTo(() => ChatMessage, 'repliedMessageId')
  repliedMessage: ChatMessage;

  @HasMany(() => ChatMessage, 'repliedMessageId')
  replies: ChatMessage[];

  @HasMany(() => ChatMessageFile, 'chatMessageId')
  files: ChatMessageFile[];

  @HasMany(() => ChatMessageView, 'chatMessageId')
  views: ChatMessageView[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default ChatMessage;
