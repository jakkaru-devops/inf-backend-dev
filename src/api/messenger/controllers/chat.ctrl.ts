import { Request, Response } from 'express';
import httpStatus from 'http-status';
import SocketIO from 'socket.io';
import seq, { Op } from 'sequelize';

import User from '../../user/models/User.model';
import Chat from '../models/Chat.model';
import ChatMessage from '../models/ChatMessage.model';

import { APIError, APIResponse } from '../../../utils/api.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import { readChatMessagesService } from '../services/readChatMessages.service';
import { createChatService } from '../services/сreateChat.service';
import { getChatMessagesService } from '../services/getChatMessages.service';
import { getTotalUnreadMessagesCountService } from '../services/getTotalUnreadMessagesCount.service';
import { getChatService } from '../services/getChat.service';
import { createChatMessageService } from '../services/createChatMessage.service';
import UserRoles from '../../role/models/UserRoles.model';
import { usersOnlineStatus } from '../../../core/userStatus';
import { getPaginationParams, getUserName, simplifyHtml } from '../../../utils/common.utils';
import ChatMember from '../models/ChatMember.model';
import ChatMessageFile from '../models/ChatMessageFile.model';
import FileModel from '../../files/models/File.model';
import { IChat } from '../interfaces';
import { IUser } from '../../user/interfaces';
import { CHAT_TYPES } from '../data';
import Role from '../../role/models/Role.model';
import { IUserRoleOption } from '../../role/interfaces';
import { CLIENT_ROLES } from '../../user/data';
import OrderRequest from '../../order/models/OrderRequest.model';
import _ from 'lodash';

class ChatCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }

  getChatList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      let search = req.query.search as string;
      const options: seq.FindAndCountOptions = {
        ...getPaginationParams(req.query),
        raw: false,
        distinct: true, // for exact filtering
        // subQuery: false,
        include: [],
        order: [['lastMessageCreatedAt', 'DESC']],
      };
      options.where = {
        [Op.and]: [],
      };

      const clientRoles = await Role.findAll({
        where: {
          label: CLIENT_ROLES,
        },
      });

      if (['manager', 'operator'].includes(authUserRole.role.label)) {
        options.where[Op.and].push({
          type: CHAT_TYPES.SUPPORT,
        });
        options.include.push({
          model: ChatMember,
          as: 'companion',
          required: true,
          where: {
            roleId: clientRoles.map(role => role.id),
          },
          include: [{ model: User, as: 'user', required: true }],
        });
      } else {
        options.where[Op.and].push({
          type: {
            [Op.ne]: CHAT_TYPES.SUPPORT,
          },
        });
        options.include.push(
          {
            model: ChatMember,
            as: 'membersRequired',
            required: true,
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
            },
          },
          {
            model: ChatMember,
            as: 'companion',
            required: true,
            where: {
              userId: {
                [Op.ne]: authUser.id,
              },
            },
            include: [{ model: User, as: 'user', required: true }],
          },
        );
      }

      if (search) {
        search = search.replace(/[) (-]/g, '');
        let phone = search.trim();
        if (!!phone.length && phone[0] === '8') phone = phone.replace('8', '+7');

        options.where[Op.and].push({
          [Op.or]: [
            {
              name: {
                [Op.iLike]: `%${search}%`,
              },
            },
            {
              [Op.or]: [
                { [`$companion.user.firstname$`]: { [Op.iLike]: `%${search}%` } },
                { [`$companion.user.middlename$`]: { [Op.iLike]: `%${search}%` } },
                { [`$companion.user.lastname$`]: { [Op.iLike]: `%${search}%` } },
                { [`$companion.user.phone$`]: { [Op.iLike]: `%${search}%` } },
                { [`$companion.user.phone$`]: { [Op.iLike]: `%${phone}%` } },
              ],
            },
          ],
        });
      }

      options.include.push(
        {
          model: ChatMessage,
          as: 'messages',
          required: false,
          separate: true,
          include: [
            {
              model: ChatMessageFile,
              as: 'files',
              separate: true,
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
          order: [['createdAt', 'DESC']],
          limit: 1,
        },
        {
          model: ChatMessage,
          as: 'messagesRequired',
          required: true,
        },
        {
          model: ChatMessage,
          as: 'unreadMessages',
          required: false,
          separate: true,
          where: ['manager', 'operator'].includes(authUserRole.role.label)
            ? {
                isUnread: true,
                authorRoleId: {
                  [Op.ne]: authUserRole.roleId,
                },
              }
            : {
                isUnread: true,
                authorId: {
                  [Op.ne]: authUser.id,
                },
              },
        },
      );

      const chats = await Chat.findAndCountAll(options);

      const customerRole = await Role.findOne({
        where: {
          label: 'customer',
        },
      });

      // Transform entities
      for (let i = 0; i < chats.rows.length; i++) {
        const chat = chats.rows[i].toJSON() as IChat;

        if (chat.type === CHAT_TYPES.GROUP) delete chat.companion;
        else (chat.companion.user as IUser).isOnline = !!(await usersOnlineStatus.getUserById(chat.companion.userId));

        if (
          authUserRole.role.label === 'seller' &&
          chat?.companion?.roleId === customerRole.id &&
          chat?.companion?.user?.phoneIsHidden
        ) {
          chat.companion.user.phone = 'hidden';
        }

        chat.name = !!chat?.companion ? getUserName(chat.companion.user, 'fl') : chat.name;

        chat.unreadMessagesCount = chat?.unreadMessages?.length || 0;

        chat.lastMessage = chat.messages[0];
        if (!!chat?.lastMessage?.text?.length) chat.lastMessage.text = simplifyHtml(chat.lastMessage.text) || '';

        delete chat.messages;
        delete chat.messagesRequired;
        delete chat.membersRequired;

        chats.rows[i] = chat;
      }

      return APIResponse({
        res,
        data: chats,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Чаты не загружены',
        error: err,
      });
    }
  };

  getSupportChatList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      let search = req.query.search as string;
      const options: seq.FindAndCountOptions = {
        ...getPaginationParams(req.query, 10),
        raw: false,
        distinct: true, // for exact filtering
        subQuery: false,
        include: [],
      };
      options.where = {
        [Op.and]: [],
      };

      options.where[Op.and].push({
        type: CHAT_TYPES.SUPPORT,
      });

      if (search) {
        search = search.replace(/[) (-]/g, '');
        let phone = search.trim();
        if (!!phone.length && phone[0] === '8') phone = phone.replace('8', '+7');

        options.where[Op.and].push({
          [Op.or]: [
            {
              name: {
                [Op.iLike]: `%${search}%`,
              },
            },
            {
              [Op.or]: [
                { [`$author.firstname$`]: { [Op.iLike]: `%${search}%` } },
                { [`$author.middlename$`]: { [Op.iLike]: `%${search}%` } },
                { [`$author.lastname$`]: { [Op.iLike]: `%${search}%` } },
                { [`$author.phone$`]: { [Op.iLike]: `%${search}%` } },
                { [`$author.phone$`]: { [Op.iLike]: `%${phone}%` } },
              ],
            },
          ],
        });
      }

      options.include.push(
        {
          model: User,
          as: 'author',
          required: true,
        },
        {
          model: ChatMessage,
          as: 'lastMessage',
          order: [['createdAt', 'DESC']],
          required: true,
          include: [
            {
              model: ChatMessageFile,
              as: 'files',
              separate: true,
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
        },
        {
          model: ChatMessage,
          as: 'unreadMessages',
          required: false,
          where: {
            isUnread: true,
            authorId: {
              [Op.ne]: authUser.id,
            },
          },
        },
      );

      const chats = await Chat.findAndCountAll(options);

      return APIResponse({
        res,
        data: chats,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список обращений не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get chat by chatId OR companionId
   * @route     GET /chat
   * @query     ? chatId? & companionId? & openChat?
   * @success 	Chat
   * @access    Private
   */
  getChat = async (req: Request, res: Response) => {
    try {
      const chatId = req.query.chatId as string;
      const openChat = req.query.openChat as string;
      const companionId = req.query.companionId as string;
      const companionRole = req.query.companionRole as IUserRoleOption;
      const orderRequestId = req.query?.orderRequestId as string;
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;

      const companionRoleEntity =
        !!companionRole &&
        (await Role.findOne({
          where: {
            [Op.or]: [
              {
                id: companionRole,
              },
              {
                label: companionRole,
              },
            ],
          },
        }));

      const { chat } = await getChatService({
        chatId,
        authUser,
        authUserRole,
        companion: !!companionId && {
          userId: companionId,
          roleId: companionRoleEntity.id,
        },
        res,
      });

      if (openChat) {
        this.io.to(authUser.id).emit('SERVER:OPEN_CHAT', {
          chatId: chat.id,
          chatType: chat.type,
          orderRequestId,
        });
      }

      return APIResponse({
        res,
        data: chat,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Чат не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get chat messages by chat Id
   * @route     GET /chat/message
   * @query     ? chatId & limit? & offset?
   * @success 	{ rows: ChatMessage[], count: number }
   * @access    Private
   */
  getChatMessages = async (req: Request, res: Response) => {
    try {
      const chatId = req.query.chatId as string;
      const authUser: User = req.body.authUser;

      const { messages } = await getChatMessagesService({ authUser, chatId, req, res });

      return APIResponse({
        res,
        data: messages,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Чат не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get chat messages by chat Id
   * @route     GET /chat/message
   * @query     ? chatId & limit? & offset?
   * @success 	{ rows: ChatMessage[], count: number }
   * @access    Private
   */
  getSupportChatMessages = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;

      const { messages } = await getChatMessagesService({ authUser, chatId: 'support', req, res });

      return APIResponse({
        res,
        data: messages,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Чат не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get total unread messages count
   * @route     GET /chat/unread
   * @success 	number
   * @access    Private
   */
  getUnreadMessagesCount = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        const {
          result: { totalUnreadMessagesCount },
          error,
        } = await getTotalUnreadMessagesCountService({ authUser, authUserRole, transaction });

        if (error) return APIError({ res, ...error });

        return APIResponse({
          res,
          data: totalUnreadMessagesCount,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Количество непрочитанных сообщений не загружено',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get unread support messages count
   * @route     GET /chat/unread/support
   * @success 	number
   * @access    Private
   */
  getUnreadSupportMessagesCount = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const authUser: User = req.body.authUser;

        const chat = await Chat.findOne({
          where: {
            type: CHAT_TYPES.SUPPORT,
          },
          include: [
            {
              model: ChatMember,
              as: 'membersRequired',
              required: true,
              where: {
                userId: authUser.id,
              },
            },
            {
              model: ChatMessage,
              as: 'unreadMessages',
              required: false,
              where: {
                isUnread: true,
                authorId: {
                  [Op.ne]: authUser.id,
                },
              },
            },
          ],
        });

        return APIResponse({
          res,
          data: chat?.unreadMessages?.length || 0,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Количество непрочитанных сообщений не загружено',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Updated messages status in chat to read, send socket to client
   * @route     POST /chat/unread
   * @query     ? chatId
   * @success 	Message[]
   * @access    Private
   */
  readChat = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const chatId = req.query.chatId as string;
        const authUser: User = req.body.authUser;

        const {
          result: { updatedMessages },
          error,
        } = await readChatMessagesService({ authUser, chatId, transaction, io: this.io });

        if (error) return APIError({ res, ...error });

        return APIResponse({
          res,
          data: updatedMessages,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Чат не загружен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Create chat, send socket
   * @route     POST /chat
   * @body      { companionId?: string, memberUserIds?: string[], includeAuthorToChat?: number }
   * @success 	{ result: Chat, message: string }
   * @access    Private
   */
  createChat = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const companionId = req.query.companionId as string;
        const companionRole = req.query.companionRole as IUserRoleOption;
        const openChat = req.query.openChat as string;
        const members: { userId: string; roleId: string }[] = req.body.members;
        const includeAuthorToChat: boolean = req.body.includeAuthorToChat || true;

        const companionRoleEntity =
          !!companionRole &&
          (await Role.findOne({
            where: {
              [Op.or]: [
                {
                  id: companionRole,
                },
                {
                  label: companionRole,
                },
              ],
            },
            transaction,
          }));

        const { chat } = await createChatService({
          authUser,
          authUserRole,
          companion: companionId
            ? {
                userId: companionId,
                roleId: companionRoleEntity.id,
              }
            : null,
          members,
          res,
          transaction,
          io: this.io,
          includeAuthorToChat,
        });

        if (openChat) {
          this.io.to(authUser.id).emit('SERVER:OPEN_CHAT', {
            chatId: chat.id,
            chatType: chat.type,
          });
        }

        return APIResponse({
          res,
          data: {
            result: chat,
            message: 'Новый чат создан',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Чат не создан',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Create message, send socket
   * @route     POST /chat/message
   * @query     { chatId: string }
   * @body      { text: string, files?: { id: string }[], companionId?: string }
   * @success 	{ result: Message, message: string }
   * @access    Private
   */
  createMessage = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const chatId = req.query.chatId as string;
        const text: string = req.body.text;
        const files: { id: string }[] = req.body.files || [];
        const orderRequestId: string = req.body?.orderRequestId;
        const repliedMessageId: string = req.body?.repliedMessageId;
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const companionId: string = req.body.companionId;

        const { chat, message } = await createChatMessageService({
          authUser,
          authUserRole,
          chatId,
          companionId,
          text,
          files: files.map(file => ({
            fileId: file.id,
          })),
          orderRequestId,
          repliedMessageId,
          transaction,
          res,
          io: this.io,
        });

        return APIResponse({
          res,
          data: {
            chat,
            message,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Сообщение не отправлено',
          error: err,
        });
      }
    });
  };

  createSupportMessage = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const chatId = req.query.chatId as string;
        const text: string = req.body.text;
        const files: { id: string }[] = req.body.files || [];
        const orderRequestId: string = req.body?.orderRequestId;
        const repliedMessageId: string = req.body?.repliedMessageId;
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        if (!text && (!files || files.length <= 0)) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Ошибка. Пустое сообщение',
          });
        }

        let chat = await Chat.findOne({
          where: {
            type: CHAT_TYPES.SUPPORT,
          },
          include: [
            {
              model: ChatMember,
              as: 'membersRequired',
              required: true,
              where: {
                userId: authUser.id,
              },
            },
          ],
          transaction,
        });
        if (!chat) {
          chat = await Chat.create(
            {
              authorId: authUser.id,
              type: CHAT_TYPES.SUPPORT,
            },
            {
              transaction,
            },
          );
        }

        await ChatMember.findOrCreate({
          where: {
            userId: authUser.id,
            chatId: chat.id,
          },
          defaults: {
            userId: authUser.id,
            roleId: authUserRole.roleId,
            chatId: chat.id,
          },
          transaction,
        });

        let message = await ChatMessage.create(
          {
            authorId: authUser.id,
            authorRoleId: authUserRole.roleId,
            chatId: chat.id,
            text: !!text?.length ? simplifyHtml(text) : null,
            orderRequestId,
            repliedMessageId,
          },
          {
            transaction,
          },
        );

        // Create chat message files
        if (files && files.length > 0) {
          for (const messageFile of files) {
            await ChatMessageFile.create(
              {
                chatMessageId: message.id,
                fileId: messageFile.id,
              },
              {
                transaction,
              },
            );
          }
        }

        // Update lastMessageCreatedAt field
        await Chat.update(
          { lastMessageCreatedAt: new Date(message.createdAt) },
          {
            where: {
              id: chat.id,
            },
            transaction,
          },
        );

        message = await ChatMessage.findByPk(message.id, {
          include: [
            {
              model: User,
              as: 'author',
            },
            {
              model: ChatMessageFile,
              as: 'files',
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
            {
              model: OrderRequest,
              as: 'orderRequest',
              required: false,
              attributes: ['id', 'idOrder', 'status'],
            },
            {
              model: ChatMessage,
              as: 'repliedMessage',
              required: false,
              include: [
                {
                  model: User,
                  as: 'author',
                  required: false,
                },
                {
                  model: ChatMessageFile,
                  as: 'files',
                  required: false,
                  include: [{ model: FileModel, as: 'file' }],
                },
              ],
            },
          ],
          transaction,
        });

        const managerRole = await Role.findOne({
          where: {
            label: 'manager',
          },
          transaction,
        });
        const managerUserRoles = await UserRoles.findAll({
          where: {
            roleId: managerRole.id,
          },
          transaction,
        });
        const operatorRole = await Role.findOne({
          where: {
            label: 'operator',
          },
          transaction,
        });
        const operatorUserRoles = await UserRoles.findAll({
          where: {
            roleId: operatorRole.id,
          },
          transaction,
        });

        const userIds = _.uniq([...managerUserRoles, ...operatorUserRoles].map(el => el?.userId).filter(Boolean));
        for (const userId of userIds) {
          this.io.to(userId).emit('SERVER:NEW_CHAT_MESSAGE', {
            chat: chat.toJSON(),
            message: message.toJSON(),
          });
        }
        this.io.to(authUser.id).emit('SERVER:NEW_CHAT_MESSAGE', {
          chat: chat.toJSON(),
          message: {
            ...message.toJSON(),
            chatId: 'support',
          },
        });

        return APIResponse({
          res,
          data: {
            chat,
            message,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Сообщение не отправлено',
          error: err,
        });
      }
    });
  };

  deleteMessage = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.query?.id as string;
        const message = await ChatMessage.findByPk(id, {
          transaction,
        });
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        if (!message) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Сообщения для удаления не найдено',
          });
        }

        const chat = await Chat.findByPk(message.chatId, {
          include: [
            {
              model: ChatMember,
              as: 'members',
            },
          ],
          transaction,
        });

        if (
          (!['manager', 'operator'].includes(authUserRole?.role?.label) && message.authorId !== authUser.id) ||
          (['manager', 'operator'].includes(authUserRole?.role?.label) &&
            message?.authorRoleId !== authUserRole?.roleId)
        ) {
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Можно удалить только свое сообщение',
          });
        }

        await ChatMessage.destroy({
          where: {
            id,
          },
          limit: 1,
          transaction,
        });

        let userIds: string[] = chat.members.map(el => el.userId);
        if (chat.type === CHAT_TYPES.SUPPORT) {
          const managerRole = await Role.findOne({
            where: {
              label: 'manager',
            },
            transaction,
          });
          const operatorRole = await Role.findOne({
            where: {
              label: 'operator',
            },
          });
          const userRoles = await UserRoles.findAll({
            where: {
              roleId: [managerRole.id, operatorRole.id],
            },
            transaction,
          });
          userIds = userIds.concat(userRoles.map(el => el.userId));
        }
        userIds = _.uniq(userIds);

        console.log('USER IDS', userIds);
        for (const userId of userIds) {
          this.io.to(userId).emit('SERVER:CHAT_MESSAGE_DELETED', {
            message: message.toJSON(),
          });
        }

        return APIResponse({
          res,
          data: message,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при удалении сообщения',
          error: err,
        });
      }
    });
  };

  getActiveAppealsCount = async (req: Request, res: Response) => {
    try {
      const count = await Chat.count({
        where: {
          isActiveAppeal: true,
        },
      });

      return APIResponse({
        res,
        data: {
          count,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Активные обращения не загружены',
        error: err,
      });
    }
  };
}

export default ChatCtrl;
