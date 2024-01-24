import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import SocketIO from 'socket.io';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import { createNotification } from '../../notification/services/createNotification.service';
import Role from '../../role/models/Role.model';
import Requisites from '../models/Requisites.model';
import SellerUpdateApplication from '../models/SellerUpdateApplication.model';
import User from '../models/User.model';
import { ENotificationType } from '../../notification/interfaces';
import { formatPhoneNumber, getUserName } from '../../../utils/common.utils';

interface IProps {
  userId: string;
  userData: User;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  user: User;
  sellerUpdateApplication: SellerUpdateApplication;
}

export const confirmSellerUpdateApplicationService = async ({
  userId,
  userData,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    let application = await SellerUpdateApplication.findOne({
      where: {
        userId,
        rejectedAt: null,
        confirmedAt: null,
      },
      order: [['createdAt', 'DESC']], // get the last application
    });
    if (!application) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Заявка не найдена',
      });
    }

    let user = await User.findByPk(userId, {
      include: [
        {
          model: Requisites,
          as: 'requisites',
        },
        {
          model: Address,
          as: 'address',
        },
        {
          model: SellerRegisterFile,
          as: 'sellerRegisterFiles',
        },
      ],
      transaction,
    });

    /* user.requisites = await user.requisites.update(
      {
        ...userData?.requisites,
      },
      {
        transaction,
      },
    ); */

    /* user.address = await user.address.update(
      transformAddress({
        ...userData.address,
      }),
      {
        transaction,
      },
    ); */

    const updatedUser = await user.update(
      {
        phone: formatPhoneNumber(userData?.phone),
        email: userData?.email,
        firstname: userData?.firstname,
        lastname: userData?.lastname,
        middlename: userData?.middlename,
        emailNotification: userData?.emailNotification,
        isAgreeEmailNotification: userData?.isAgreeEmailNotification,
      },
      {
        transaction,
      },
    );

    /* for (let i = 0; i < user.sellerRegisterFiles.length; i++) {
      const regFile = user.sellerRegisterFiles[i];
      const regFileData = userData.sellerRegisterFiles.find(el => el.label === regFile.label);
      user.sellerRegisterFiles[i] = await regFile.update(
        {
          fileId: regFileData?.file?.id,
        },
        {
          transaction,
        },
      );
    } */

    user = {
      ...updatedUser,
      requisites: user.requisites,
      address: user.address,
      sellerRegisterFiles: user.sellerRegisterFiles,
    } as User;

    application = await application.update(
      {
        confirmedAt: new Date(),
      },
      {
        transaction,
      },
    );

    await createNotification({
      userId: userData.id,
      role: 'seller',
      type: ENotificationType.sellerUpdateApplicationConfirmed,
      data: {
        seller: {
          id: userId,
          name: getUserName(user),
        },
        applicationId: application.id,
      },
      autoread: true,
      io,
      res,
      transaction,
    });

    return {
      user,
      sellerUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных не была подтверждена',
      error: err,
    });
  }
};
