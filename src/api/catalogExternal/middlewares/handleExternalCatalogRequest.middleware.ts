import { Request, Response, NextFunction } from 'express';
import ExternalCatalogRequest from '../models/ExternalCatalogRequest.model';
import ExternalCatalogBannedIP from '../models/ExternalCatalogBannedIP.model';
import { APIError } from '../../../utils/api.utils';
import { IAPIError } from '../../../interfaces/common.interfaces';
import httpStatus from 'http-status';
import addDate from 'date-fns/add';
import { Op } from 'sequelize';

export const handleExternalCatalogRequest = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip;
  const path = req.path;
  const nowDate = new Date();
  const nowTime = nowDate.getTime();

  const bannedIPError: IAPIError = {
    res,
    status: httpStatus.TOO_MANY_REQUESTS,
    message: 'Запросы к каталогам недоступны',
  };

  // Verify if IP is not banned
  const bannedIP = await ExternalCatalogBannedIP.findOne({
    where: { ip },
  });
  if (!!bannedIP) {
    if (new Date(bannedIP.banExpiresAt).getTime() < nowTime) {
      throw APIError(bannedIPError);
    }
  }

  // Ban IP after 2000 requests per day
  const timeDayBack = addDate(nowDate, { days: -1 });
  const oneDayRequestsCount = await ExternalCatalogRequest.count({
    where: {
      ip,
      createdAt: { [Op.gt]: timeDayBack },
    },
  });
  if (oneDayRequestsCount >= 2000) {
    await ExternalCatalogBannedIP.findOrCreate({
      where: { ip },
      defaults: {
        ip,
        banExpiresAt: addDate(nowDate, { years: 99 }),
      },
    });
    throw APIError(bannedIPError);
  }

  // Save each request
  await ExternalCatalogRequest.create({
    ip,
    path,
  });

  next();
};
