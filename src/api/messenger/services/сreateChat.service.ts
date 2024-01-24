import { Response } from 'express';
import { Transaction } from 'sequelize';
import SocketIO from 'socket.io';
import _ from 'lodash';

import { CHAT_TYPES } from '../data';
import Chat from '../models/Chat.model';
import ChatMember from '../models/ChatMember.model';
import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import { getChatService } from './getChat.service';
import { APIError } from '../../../utils/api.utils';
import UserRoles from '../../role/models/UserRoles.model';
import { IUserRoleOption } from '../../role/interfaces';

interface ICreateChatProps {
  authUser: User;
  authUserRole: UserRoles;
  companion?: {
    userId: string;
    roleId: string;
  };
  members: {
    userId: string;
    roleId: string;
  }[];
  includeAuthorToChat?: boolean;
  res: Response;
  transaction: Transaction;
  io: SocketIO.Server;
}

interface IResult {
  chat: Chat;
}

export const createChatService = async ({
  authUser,
  authUserRole,
  companion,
  members: membersInit,
  includeAuthorToChat = true,
  res,
  transaction,
  io,
}: ICreateChatProps): Promise<IResult> => {
  try {
    const result = await getChatService({ authUser, authUserRole, companion, throwError: false, res, transaction });

    if (result.chat) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Чат с этим пользователем уже существует',
        error: result.chat as any,
      });
    }

    // Define chat members
    let members = membersInit || [];
    if (companion) {
      members = [].concat(companion);
    }
    if (includeAuthorToChat) {
      members.push({
        userId: authUser.id,
        roleId: authUserRole.roleId,
      });
    }
    members = _.uniqBy(members, 'userId');

    // Define chat type
    let chatType: number = null;
    if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
      chatType = CHAT_TYPES.SUPPORT;
    } else {
      if (companion) {
        chatType = CHAT_TYPES.PERSONAL;
      }
      if (membersInit) {
        chatType = CHAT_TYPES.GROUP;
      }
    }

    const chat = await Chat.create(
      {
        authorId: authUser.id,
        type: chatType,
      },
      { transaction },
    );

    // Create Chat members
    for (const member of members) {
      await ChatMember.create(
        {
          userId: member.userId,
          chatId: chat.id,
          roleId: member.roleId,
        },
        { transaction },
      );
    }

    for (const member of members) {
      io.to(member.userId).emit('SERVER:NEW_CHAT');
    }
    io.to(authUser.id).emit('SERVER:OPEN_CHAT', {
      chatId: chat.id,
      chatType: chat.type,
    });

    return {
      chat,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при создании чата',
      error: err,
    });
  }
};
