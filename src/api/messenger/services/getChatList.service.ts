import { Response } from 'express';
import User from '../../user/models/User.model';
import seq, { Op, Transaction } from 'sequelize';
import Chat from '../models/Chat.model';
import ChatMember from '../models/ChatMember.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import ChatMessage from '../models/ChatMessage.model';
import ChatMessageFile from '../models/ChatMessageFile.model';
import FileModel from '../../files/models/File.model';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';

interface IFetchChatListProps {
  authUser: User;
  limit?: string;
  offset?: string;
  search?: string;
  withMessages?: boolean;
  res: Response;
}

interface IResult {
  chatList: { rows: Chat[]; count: number };
}

export const getChatListService = async ({
  authUser,
  limit,
  offset,
  search,
  withMessages = false,
  res,
}: IFetchChatListProps): Promise<IResult> => {
  try {
    const filteredChatIds = await getAllChatIdsBySearch(authUser, search);

    const options: seq.FindAndCountOptions = {
      raw: false,
      distinct: true, // for exact filtering
      subQuery: false,
    };

    options.where = { id: filteredChatIds };
    options.order = [['lastMessageCreatedAt', 'DESC']];

    if (limit) options.limit = +limit;
    if (offset) options.offset = +offset;

    options.include = [];

    options.include.push({
      model: ChatMember,
      as: 'members',
      required: true,
      separate: true,
      include: [
        {
          model: User,
          as: 'user',
          required: true,
        },
      ],
    });

    options.include.push({
      model: ChatMessage,
      as: 'messages',
      separate: true,
      limit: !withMessages ? 1 : 10,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: ChatMessageFile,
          as: 'files',
          separate: true,
          required: false,
          include: [{ model: FileModel, as: 'file' }],
        },
      ],
    });

    const chatList = await Chat.findAndCountAll(options);

    return {
      chatList,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при получении списка чатов',
      error: err,
    });
  }
};

const getAllChatIdsBySearch = async (authUser: User, search?: IFetchChatListProps['search']): Promise<string[]> => {
  const chatMembersByCurrentUser = await ChatMember.findAll({
    where: { userId: authUser.id },
  });

  if (search) {
    search = search.replace(/[) (-]/g, '');
  }
  const phone = search && search[0] === '8' ? search.replace('8', '+7') : null;

  const currentUserChatIds = chatMembersByCurrentUser.map(member => member.chatId);

  const options: seq.FindOptions = {};

  options.where = { [Op.and]: [] };

  options.where[Op.and].push({
    userId: {
      [Op.ne]: authUser.id,
    },
  });

  options.where[Op.and].push({ chatId: currentUserChatIds });

  options.include = [];

  if (search) {
    options.include.push({
      model: User,
      as: 'user',
    });

    options.where[Op.and].push({
      [Op.or]: [
        { [`$user.firstname$`]: { [Op.iLike]: `%${search}%` } },
        { [`$user.middlename$`]: { [Op.iLike]: `%${search}%` } },
        { [`$user.lastname$`]: { [Op.iLike]: `%${search}%` } },
        { [`$user.phone$`]: { [Op.iLike]: `%${search}%` } },
        { [`$user.phone$`]: { [Op.iLike]: `%${phone}%` } },
      ],
    });
  }

  const companions = await ChatMember.findAll(options);

  // no duplicates chat ids
  return [...new Set(companions.map(member => member.chatId))];
};
