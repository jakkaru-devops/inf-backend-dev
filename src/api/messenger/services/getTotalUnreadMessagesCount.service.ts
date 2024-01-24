import seq, { Op, Transaction } from 'sequelize';
import ChatMember from '../models/ChatMember.model';
import ChatMessage from '../models/ChatMessage.model';
import User from '../../user/models/User.model';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import httpStatus from 'http-status';
import UserRoles from '../../role/models/UserRoles.model';
import Chat from '../models/Chat.model';
import { CHAT_TYPES } from '../data';

interface ITotalUnreadMessagesCountProps {
  authUser: User;
  authUserRole: UserRoles;
  transaction?: Transaction;
}

interface IResult {
  totalUnreadMessagesCount: number;
}

export const getTotalUnreadMessagesCountService = async ({
  authUser,
  authUserRole,
  transaction,
}: ITotalUnreadMessagesCountProps): Promise<IServiceResponse<IResult>> => {
  try {
    const options: seq.FindOptions = {
      include: [],
      transaction,
    };
    options.where = {
      [Op.and]: [],
    };

    if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
      options.where[Op.and].push({
        type: CHAT_TYPES.SUPPORT,
      });
    } else {
      options.where[Op.and].push({
        [Op.or]: [
          {
            [`$membersRequired.userId$`]: authUser.id,
            [`$membersRequired.roleId$`]: authUserRole.roleId,
          },
          {
            [`$membersRequired.userId$`]: authUser.id,
            type: CHAT_TYPES.SUPPORT,
          },
        ],
      });
      options.include.push({
        model: ChatMember,
        as: 'membersRequired',
        required: true,
      });
    }

    const chats = await Chat.findAll(options);
    const currentUserChatIds = chats.map(chat => chat.id);

    const totalUnreadMessagesCount = await ChatMessage.count({
      where: {
        chatId: currentUserChatIds,
        isUnread: true,
        authorId: {
          [Op.ne]: authUser.id,
        },
      },
      transaction,
    });

    return {
      result: {
        totalUnreadMessagesCount,
      },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при получении количества непрочитанных сообщений',
        error: err,
      },
    };
  }
};
