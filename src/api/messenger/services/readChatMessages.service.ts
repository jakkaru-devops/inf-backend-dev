import User from '../../user/models/User.model';
import ChatMessage from '../models/ChatMessage.model';
import { Op, Transaction } from 'sequelize';
import Chat from '../models/Chat.model';
import ChatMember from '../models/ChatMember.model';
import SocketIO from 'socket.io';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import httpStatus from 'http-status';
import { CHAT_TYPES } from '../data';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';

interface IReadChatMessagesProps {
  authUser: User;
  chatId: string;
  transaction?: Transaction;
  io: SocketIO.Server;
}

interface IResult {
  updatedMessages: ChatMessage[];
}

export const readChatMessagesService = async ({
  authUser,
  chatId,
  transaction,
  io,
}: IReadChatMessagesProps): Promise<IServiceResponse<IResult>> => {
  try {
    let chat: Chat = null;

    if (chatId === 'support') {
      chat = await Chat.findOne({
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
            model: ChatMember,
            as: 'members',
          },
        ],
        transaction,
      });
    } else {
      chat = await Chat.findByPk(chatId, {
        include: [
          {
            model: ChatMember,
            as: 'members',
          },
        ],
        transaction,
      });
    }

    const updatedMessages = await ChatMessage.update(
      {
        isUnread: false,
      },
      {
        where: {
          chatId: chat.id,
          authorId: {
            [Op.ne]: authUser.id,
          },
        },
        transaction,
      },
    );

    const chatMemberIdList = chat.members.map(member => member.userId);

    if (chatId === 'support') {
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
        transaction,
      });
      const managers = await User.findAll({
        include: [
          {
            model: UserRoles,
            as: 'roles',
            where: {
              roleId: [managerRole.id, operatorRole.id],
            },
          },
        ],
        transaction,
      });
      chatMemberIdList.push(...managers.map(user => user.id));
    }

    console.log('MEMBERS', chatMemberIdList);

    for (const userId of chatMemberIdList) {
      io.to(userId).emit('SERVER:READ_CHAT_MESSAGES', {
        userId: authUser.id,
        chatId: chatId === 'support' && userId === authUser.id ? 'support' : chat.id,
      });
    }

    return {
      result: {
        updatedMessages: updatedMessages[1] || [],
      },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при прочтении чата',
        error: err,
      },
    };
  }
};
