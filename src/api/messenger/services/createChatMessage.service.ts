import { Response } from 'express';
import { Transaction } from 'sequelize';
import SocketIO from 'socket.io';

import ChatMessage from '../models/ChatMessage.model';
import ChatMessageFile from '../models/ChatMessageFile.model';
import FileModel from '../../files/models/File.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import User from '../../user/models/User.model';
import Chat from '../models/Chat.model';
import httpStatus from 'http-status';
import ChatMember from '../models/ChatMember.model';
import UserRoles from '../../role/models/UserRoles.model';
import { APIError } from '../../../utils/api.utils';
import Role from '../../role/models/Role.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import { sendPushNotification } from '../../notification/utils/sendPushNotification';
import { simplifyHtml } from '../../../utils/common.utils';
import { mailer } from '../../../utils/mailer';
import WEB_APP_URLS from '../../notification/utils/generateLink';
import { usersOnlineStatus } from '../../../core/userStatus';
import { IUser } from '../../user/interfaces';

interface ICreateChatMessageProps {
  authUser: User;
  authUserRole: UserRoles;
  chatId: string;
  companionId?: string;
  text: string;
  files?: { fileId: string }[];
  params?: any;
  orderRequestId: string;
  repliedMessageId: string;
  transaction: Transaction;
  res: Response;
  io: SocketIO.Server;
}

interface IResult {
  chat: Chat;
  message: ChatMessage;
}

export const createChatMessageService = async ({
  authUser,
  authUserRole,
  chatId,
  text,
  files,
  params,
  orderRequestId,
  repliedMessageId,
  transaction,
  res,
  io,
}: ICreateChatMessageProps): Promise<IResult> => {
  try {
    if (!text && (!files || files.length <= 0)) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Ошибка. Пустое сообщение',
      });
    }

    const chat = await Chat.findByPk(chatId, {
      include: [
        {
          model: ChatMember,
          as: 'members',
        },
      ],
      transaction,
    });
    if (!chat) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Чат не найден',
        error: chat as any,
      });
    }

    // Create message
    let message = await ChatMessage.create(
      {
        authorId: authUser.id,
        authorRoleId: authUserRole.roleId,
        chatId: chat.id,
        text: !!text?.length ? simplifyHtml(text) : null,
        params,
        orderRequestId,
        repliedMessageId,
      },
      { transaction },
    );

    // Create chat message files
    if (files && files.length > 0) {
      for (const messageFile of files) {
        await ChatMessageFile.create(
          {
            chatMessageId: message.id,
            fileId: messageFile.fileId,
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
          include: [{ model: JuristicSubject, as: 'juristicSubjects' }],
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

    const customerRole = await Role.findOne({
      where: {
        label: 'customer',
      },
      transaction,
    });
    const sellerRole = await Role.findOne({
      where: {
        label: 'seller',
      },
      transaction,
    });

    const chatMembers = chat.members;

    message = message.toJSON() as ChatMessage;

    for (const chatMember of chatMembers) {
      const messageJson = JSON.parse(JSON.stringify(message)) as ChatMessage;
      if (chatMember?.roleId === sellerRole.id && authUserRole.role.label === 'customer' && authUser.phoneIsHidden) {
        messageJson.author.phone = 'hidden';
      }

      io.to(chatMember.userId).emit('SERVER:NEW_CHAT_MESSAGE', {
        chat: chat.toJSON(),
        message: messageJson,
      });

      if (chatMember.userId !== authUser.id) {
        sendPushNotification({
          userId: chatMember.userId,
          roleId: chatMember.roleId,
          notification: null,
          message: messageJson,
          module: 'messenger',
        });
      }

      const chatMemberUser = await User.findByPk(chatMember.userId);

      let chatLink = WEB_APP_URLS.chat(chat.id); // Генерируем ссылку на чат

      const isOnlineStatus = ((chatMemberUser as IUser).isOnline = !!(await usersOnlineStatus.getUserById(
        chatMemberUser.id,
      )));

      if (
        chatMemberUser?.id !== authUser.id &&
        chatMemberUser?.emailNotification !== null &&
        chatMemberUser?.isAgreeEmailNotification == true &&
        isOnlineStatus !== true
      ) {
        const mes = {
          to: chatMemberUser.emailNotification,
          subject: `Новое сообщение в чате Inf`,
          html: `<p>У Вас новое сообщение в чате от ${message.author.firstname} ${message.author.lastname}, <a href="${chatLink}">смотреть</a></p>`,
        };
        mailer(mes);
      }
    }

    return {
      chat,
      message,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при создании сообщения',
      error: err,
    });
  }
};
