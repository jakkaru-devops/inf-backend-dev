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
import { gaussRound } from '../../../utils/common.utils';
import { calculateOrderCash } from '../../order/utils';

export const updateAllRewardsService = async (req: Request, res: Response) => {
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

    const allRewards = await Reward.findAll();
    let count = allRewards.length;

    for (const reward of allRewards) {
      console.log(`Count remaining - ${count}, ${reward.id}`);
      count--;

      const order = await Order.findByPk(reward.orderId, {
        include: [
          {
            model: RequestProduct,
            as: 'products',
          },
          {
            model: Organization,
            as: 'organization',
            required: true,
          },
        ],
      });
      if (!order) continue;

      const totalPrice = order.products
        .map(({ unitPrice, count }) => unitPrice * count)
        .filter(Boolean)
        .reduce((a, b) => a + b, 0);

      await order.update({
        totalPrice,
      });
      await reward.update({
        amount: calculateOrderCash(totalPrice, order.organization.priceBenefitPercent, true),
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
