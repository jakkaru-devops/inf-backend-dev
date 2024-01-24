import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { Op } from 'sequelize';
import formatDistance from 'date-fns/formatDistance';
import Reward from '../../order/models/Reward.model';
import Order from '../../order/models/Order.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import Organization from '../../organization/models/Organization.model';
import { gaussRound, round } from '../../../utils/common.utils';
import { calculateOrderCash } from '../../order/utils';
import OrderRequest from '../../order/models/OrderRequest.model';

export const createMissingRewardsService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const startTime = new Date().getTime();

    const offers = await Order.findAll({
      where: {
        status: 'PAID',
      },
    });
    for (const offer of offers) {
      const reward = await Reward.findOne({
        where: {
          orderId: offer.id,
        },
      });
      if (!!reward) continue;

      const products = (
        await RequestProduct.findAll({
          where: {
            orderId: offer.id,
          },
        })
      ).filter(({ isSelected, count }) => isSelected && !!count);

      const offerTotalPrice = products.map(({ unitPrice, count }) => unitPrice * count).reduce((a, b) => a + b, 0);
      const organization = await Organization.findByPk(offer.organizationId);

      await Reward.create({
        orderId: offer.id,
        sellerId: offer.sellerId,
        amount: round(calculateOrderCash(offerTotalPrice, organization.priceBenefitPercent, true)),
      });
    }

    const endTime = new Date().getTime();

    console.log(`Rewards transformation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Rewards transformation has been successfully completed',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while rewards transformation',
      error: err,
    });
  }
};
