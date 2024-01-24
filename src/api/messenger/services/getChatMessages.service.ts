import { Request, Response } from 'express';
import User from '../../user/models/User.model';
import ChatMessage from '../models/ChatMessage.model';
import ChatMessageView from '../models/ChatMessageView.model';
import ChatMessageFile from '../models/ChatMessageFile.model';
import FileModel from '../../files/models/File.model';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import Chat from '../models/Chat.model';
import { CHAT_TYPES } from '../data';
import ChatMember from '../models/ChatMember.model';
import { getPaginationParams, simplifyHtml } from '../../../utils/common.utils';
import { APIError } from '../../../utils/api.utils';
import OrderRequest from '../../order/models/OrderRequest.model';

interface IGetChatMessagesProps {
  authUser: User;
  chatId: string;
  req: Request;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  messages: { count: number; rows: ChatMessage[] };
}

export const getChatMessagesService = async ({
  authUser,
  chatId,
  req,
  res,
  transaction,
}: IGetChatMessagesProps): Promise<IResult> => {
  try {
    if (chatId === 'support') {
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
            as: 'messagesRequired',
            required: true,
          },
        ],
      });
      chatId = chat?.id;
    }

    if (!chatId) {
      return {
        messages: {
          count: 0,
          rows: [],
        },
      };
    }

    let messages = await ChatMessage.findAndCountAll({
      ...getPaginationParams(req.query, 20),
      where: {
        chatId,
      },
      include: [
        {
          model: User,
          as: 'author',
        },
        {
          model: ChatMessageView,
          as: 'views',
          required: false,
          where: {
            userId: authUser.id,
          },
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
      order: [['createdAt', 'DESC']],
      distinct: true, // for exact filtering
      subQuery: false,
      transaction,
    });

    messages.rows = messages.rows.map(message => message.toJSON() as ChatMessage).reverse();

    for (const message of messages.rows) {
      if (!!message?.text?.length) message.text = simplifyHtml(message.text) || '';
    }

    return {
      messages,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при получении сообщений',
      error: err,
    });
  }
};
