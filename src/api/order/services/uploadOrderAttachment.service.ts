import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError } from '../../../utils/api.utils';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import { ORDERS_UPLOAD_SECTION, UPLOAD_FILES_DIRECTORY } from '../../../config/env';
import { getFilePreviewUrl } from '../../catalog/utils';
import fileUpload from 'express-fileupload';
import { generateRandomCode } from '../../../utils/common.utils';
import fs from 'fs';
import { createDir } from '../../files/utils';
import { createNotification } from '../../notification/services/createNotification.service';
import { IUserRoleOption } from '../../role/interfaces';

interface IProps {
  filename: string;
  orderId: string;
  offerId: string;
  group: string;
  io: SocketIO.Server;
  req: Request;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  id: string;
  userId: string;
  group: string;
  name: string;
  url: string;
  fileDBPath: string;
}

export const uploadOrderAttachmentService = async ({
  filename,
  orderId,
  offerId,
  group,
  io,
  req,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  const authUser: User = req.body.authUser;
  const authUserRole: UserRoles = req.body.authUserRole;

  const orderRequest = await OrderRequest.findByPk(orderId, {
    include: [
      {
        model: Order,
        as: 'orders',
        where: offerId && { id: offerId },
      },
    ],
    transaction,
  });

  if (!orderRequest)
    throw APIError({
      res,
      status: httpStatus.NOT_FOUND,
      message: 'Заказ не найден',
    });

  const file = req.files.file as fileUpload.UploadedFile;
  const originalFilename = filename || file.name;
  const newFileName = `${generateRandomCode({
    length: 20,
    symbols: false,
    uppercase: false,
    excludeSimilarCharacters: false,
  })}-${originalFilename}`;
  const directoryPath = `${ORDERS_UPLOAD_SECTION}/${orderRequest.idOrder}/${group}`;
  const fileDBPath = `${directoryPath}/${newFileName}`;
  const ext = originalFilename.split('.').pop();

  const sizeMb = file.size / 1024 / 1024;
  if (sizeMb > 20) {
    throw APIError({
      res,
      status: httpStatus.BAD_REQUEST,
      message: 'Максимальный размер файла для загрузки - 20 мб',
    });
  }

  try {
    const newFile = await FileModel.create(
      {
        userId: authUser.id,
        name: originalFilename,
        ext,
        size: file.size,
        path: fileDBPath,
      },
      { transaction },
    );

    if (!fs.existsSync(`${UPLOAD_FILES_DIRECTORY}/${directoryPath}`)) {
      const newDir = await createDir(`${UPLOAD_FILES_DIRECTORY}/${directoryPath}`);
      if (!newDir)
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Директория не была создана',
          error: newDir as any,
        });
    }

    await file.mv(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`).catch(err => {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Файл не загружен',
        error: err,
      });
    });

    const orderRequestFile = await OrderRequestFile.create(
      {
        orderRequestId: orderId,
        orderId: offerId || null,
        fileId: newFile.id,
        group,
      },
      { transaction },
    );

    const receivers: { userId: string; roleLabel: IUserRoleOption }[] = [];
    if (authUserRole.role.label !== 'customer') {
      const customerRole = await Role.findOne({ where: { label: 'customer' }, transaction });
      receivers.push({
        userId: orderRequest.customerId,
        roleLabel: customerRole.label,
      });
    }
    if (authUserRole.role.label !== 'seller') {
      for (const offer of orderRequest.orders) {
        receivers.push({
          userId: offer.sellerId,
          roleLabel: 'seller',
        });
      }
    }

    for (const receiver of receivers) {
      await createNotification({
        userId: receiver.userId,
        role: receiver.roleLabel,
        type: ENotificationType.orderAttachmentUploaded,
        autoread: false,
        data: {
          idOrder: orderRequest.idOrder,
          orderRequestId: orderRequest.id,
          attachmentGroup: group,
        },
        io,
        res,
        transaction,
      });
    }

    return {
      id: orderRequestFile.id,
      userId: newFile.userId,
      group: orderRequestFile.group,
      name: newFile.name,
      url: getFilePreviewUrl(newFile),
      fileDBPath,
    };
  } catch (err) {
    fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке вложения',
      error: err,
    });
  }
};
