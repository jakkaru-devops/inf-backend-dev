import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import Product from '../../catalog/models/Product.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import { Op } from 'sequelize';
import Warehouse from '../../catalog/models/Warehouse.model';

export const fillProductsMinPriceService = async (req: Request, res: Response) => {
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

    await Product.update(
      {
        minPrice: null,
      },
      {
        where: {
          minPrice: { [Op.ne]: null },
        },
      },
    );

    const warehouses = await Warehouse.findAll();
    const stockBalances = await StockBalance.findAll({
      where: {
        amount: { [Op.gt]: 0 },
        warehouseId: warehouses.map(el => el.id),
      },
    });
    let counter = stockBalances.length;

    const minPrices: { [productId: string]: number } = {};

    for (const stockBalance of stockBalances) {
      console.log(`${counter} items left. Current ${stockBalance.id}`);
      counter--;

      if (!minPrices?.[stockBalance.productId] || stockBalance.price < minPrices[stockBalance.productId]) {
        minPrices[stockBalance.productId] = stockBalance.price;
      }
    }

    const minPricesArr = Object.keys(minPrices).map(productId => ({
      productId,
      minPrice: minPrices[productId],
    }));
    counter = minPricesArr.length;

    for (const { productId, minPrice } of minPricesArr) {
      console.log(`${counter} products left. Current ${productId}`);
      counter--;

      await Product.update(
        {
          minPrice,
        },
        {
          where: {
            id: productId,
          },
        },
      );
    }

    const endTime = new Date().getTime();

    console.log(`Operation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Success',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Fail',
      error: err,
    });
  }
};
