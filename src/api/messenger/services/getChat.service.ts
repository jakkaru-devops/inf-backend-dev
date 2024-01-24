import { Response } from 'express';
import seq, { Op, Transaction, where } from 'sequelize';
import JuristicSubject from '../../user/models/JuristicSubject.model';

import Chat from '../models/Chat.model';
import ChatMember from '../models/ChatMember.model';
import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import { CHAT_TYPES } from '../data';
import { APIError } from '../../../utils/api.utils';
import { IUser } from '../../user/interfaces';
import { usersOnlineStatus } from '../../../core/userStatus';
import UserRoles from '../../role/models/UserRoles.model';
import { getUserName } from '../../../utils/common.utils';

interface IGetChatProps {
  chatId?: string;
  authUser: User;
  authUserRole: UserRoles;
  companion?: {
    userId: string;
    roleId: string;
  };
  throwError?: boolean;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  chat: Chat;
}

export const getChatService = async ({
  chatId,
  authUser,
  authUserRole,
  companion,
  throwError = true,
  res,
  transaction,
}: IGetChatProps): Promise<IResult> => {
  try {
    const options: seq.FindOptions = {
      include: [],
      transaction,
    };
    options.where = {};

    if (chatId) {
      if (chatId === 'support') {
        if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
          if (throwError) {
            throw APIError({
              res,
              status: httpStatus.BAD_REQUEST,
              message: 'Менеджер не может связываться с поддержкой сервиса',
            });
          } else {
            return {
              chat: null,
            };
          }
        }

        options.where.type = CHAT_TYPES.SUPPORT;
        options.include.push({
          model: ChatMember,
          as: 'membersRequired',
          required: true,
          where: { userId: authUser.id },
        });
      } else {
        options.where.id = chatId;
        options.include.push({
          model: ChatMember,
          as: 'companion',
          required: true,
          where: {
            userId: {
              [Op.ne]: authUser.id,
            },
          },
          include: [
            {
              model: User,
              as: 'user',
              required: true,
            },
          ],
        });
      }
    } else {
      if (companion) {
        if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
          options.where.type = CHAT_TYPES.SUPPORT;
          options.include.push({
            model: ChatMember,
            as: 'companion',
            required: true,
            where: { userId: companion.userId },
            include: [
              {
                model: User,
                as: 'user',
                required: true,
              },
            ],
          });
        } else {
          options.where.type = CHAT_TYPES.PERSONAL;
          options.include.push(
            {
              model: ChatMember,
              as: 'companion',
              required: true,
              where: { userId: companion.userId, roleId: companion.roleId },
              include: [
                {
                  model: User,
                  as: 'user',
                  required: true,
                },
              ],
            },
            {
              model: ChatMember,
              as: 'membersRequired',
              required: true,
              where: { userId: authUser.id, roleId: authUserRole.roleId },
            },
          );
        }
      } else {
        if (throwError) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать id чата или данные собеседника',
          });
        } else {
          return {
            chat: null,
          };
        }
      }
    }

    options.include.push(
      {
        model: User,
        as: 'author',
      },
      {
        model: ChatMember,
        as: 'members',
        include: [
          {
            model: User,
            as: 'user',
          },
        ],
      },
    );

    let chat = await Chat.findOne(options);

    if (!chat) {
      if (throwError) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при получении чата',
          error: chat as any,
        });
      } else {
        return {
          chat: null,
        };
      }
    }

    // Transform entity
    chat = chat.toJSON() as Chat;
    if (chat.type === CHAT_TYPES.GROUP) delete chat.companion;
    else {
      if (!!chat?.companion) {
        (chat.companion.user as IUser).isOnline = !!(await usersOnlineStatus.getUserById(chat.companion.userId));
      }
    }
    if (!!chat?.companion) {
      chat.name = getUserName(chat?.companion.user, 'fl');
      if (!chat.name) {
        chat.name = chat?.companion.user?.phoneIsHidden
          ? `Покупатель № ${chat.companion.user?.idInt}`
          : chat.companion.user?.phone;
        if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
          chat.name = chat.companion.user.phone;
        }
      }
    }
    //chat.name = !!chat?.companion ? chat.companion.user?.firstname || chat.companion.user.phone : chat?.name;

    return {
      chat,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при получении чата',
      error: err,
    });
  }
};
