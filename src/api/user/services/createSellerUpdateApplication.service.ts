import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import SocketIO from 'socket.io';
import Role from '../../role/models/Role.model';
import SellerUpdateApplication from '../models/SellerUpdateApplication.model';
import User from '../models/User.model';
import { ENotificationType } from '../../notification/interfaces';
import SellerUpdateApplicationFile from '../models/SellerUpdateApplicationFile.model';
import { formatPhoneNumber, getUserName } from '../../../utils/common.utils';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';

interface IProps {
  userId: string;
  userData: User;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  sellerUpdateApplication: SellerUpdateApplication;
}

export const createSellerUpdateApplicationService = async ({
  userId,
  userData,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const activeApplication = await SellerUpdateApplication.findOne({
      where: {
        userId,
        rejectedAt: null,
        confirmedAt: null,
      },
      order: [['createdAt', 'DESC']], // get the last application
      transaction,
    });

    if (!!activeApplication) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'У вас уже есть активная заявка на редактирование данных',
      });
    }

    const userEntity = await User.findByPk(userId, {
      transaction,
    });
    const application = await SellerUpdateApplication.create(
      {
        phone: formatPhoneNumber(userData?.phone),
        email: userData?.email,
        firstname: userData?.firstname,
        lastname: userData?.lastname,
        middlename: userData?.middlename,
        emailNotification: userData?.emailNotification,
        isAgreeEmailNotification: userData?.isAgreeEmailNotification,
        userId,
      },
      {
        transaction,
      },
    );

    for (const regFileData of userData.sellerRegisterFiles) {
      await SellerUpdateApplicationFile.create(
        {
          applicationId: application.id,
          fileId: regFileData.file.id,
          label: regFileData.label,
        },
        {
          transaction,
        },
      );
    }

    const sellerRole = await Role.findOne({
      where: {
        label: 'seller',
      },
      transaction,
    });

    await createNotificationForAllManagersService({
      type: ENotificationType.sellerUpdateApplicationCreated,
      data: {
        seller: {
          id: userId,
          emailNotification: userEntity.emailNotification,
          isAgreeEmailNotification: userEntity.isAgreeEmailNotification,
          name: getUserName(userEntity),
        },
        applicationId: application.id,
      },
      aboutUserId: userId,
      aboutUserRoleId: sellerRole.id,
      autoread: false,
      io,
      res,
      transaction,
    });

    return {
      sellerUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных не создана',
      error: err,
    });
  }
};
