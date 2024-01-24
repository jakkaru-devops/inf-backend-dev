import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import SocketIO from 'socket.io';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import { createNotification } from '../../notification/services/createNotification.service';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import SellerUpdateApplication from '../models/SellerUpdateApplication.model';
import User from '../models/User.model';
import { ENotificationType } from '../../notification/interfaces';
import SellerUpdateApplicationFile from '../models/SellerUpdateApplicationFile.model';
import { formatPhoneNumber } from '../../../utils/common.utils';
import UserReview from '../models/UserReview.model';
import { USER_REVIEW_STATUSES } from '../data';

interface IProps {
  status: number;
  receiverId: string;
  orderId: string;
  productOfferId: string;
  rating: number;
  text: string;
  authUser: User;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  userReview: UserReview;
}

export const createUserReview = async ({
  status,
  receiverId,
  orderId,
  productOfferId,
  rating,
  text,
  authUser,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const receiver = await User.findByPk(receiverId as string);
    const oldRatingValue = receiver.ratingValue || 0;

    if (!receiver) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Получатель отзыва не найден',
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Некорректное значение рейтинга',
      });
    }

    if (
      !!(await UserReview.count({
        where: {
          receiverId,
          authorId: authUser.id,
          orderId,
          productOfferId,
        },
      }))
    )
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Отзыв уже был отправлен',
      });

    let userReview = await UserReview.create(
      {
        status,
        receiverId,
        authorId: authUser.id,
        orderId,
        productOfferId,
        rating,
        addedRating: 0,
        text: text || null,
      },
      { transaction },
    );

    const reviewList = await UserReview.findAll({
      where: {
        receiverId,
        rating: {
          [Op.gt]: 0,
        },
      },
      offset: 0,
      limit: 50,
      order: [['createdAt', 'DESC']],
      attributes: ['receiverId', 'rating', 'createdAt'],
      transaction,
    });

    const ratingValue = reviewList.map(({ rating }) => rating).reduce((a, b) => a + b, 0) / (reviewList.length || 1);

    await receiver.update({ ratingValue: Number(ratingValue.toFixed(2)) }, { transaction });
    userReview = await userReview.update(
      { addedRating: Number((ratingValue - oldRatingValue).toFixed(2)) },
      {
        transaction,
      },
    );

    if (status === USER_REVIEW_STATUSES.DEFAULT) {
      await createNotification({
        userId: userReview.receiverId,
        role: 'seller',
        type: ENotificationType.newSellerReview,
        autoread: true,
        data: {
          review: {
            receiverId: userReview.receiverId,
            ratingValue: Number(ratingValue.toFixed(2)),
          },
        },
        io,
        res,
        transaction,
      });
    }

    return {
      userReview,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при создании отзыва',
      error: err,
    });
  }
};
