import e, { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import Product from '../../catalog/models/Product.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import _ from 'lodash';
import { simplifyProductName } from '../../catalog/utils';
import { PUBLIC_PRODUCT_STATUSES } from '../../catalog/data';
import { Op } from 'sequelize';
import RequestProduct from '../../order/models/RequestProduct.model';

export const fillRequestProductsReserveDataService = async (req: Request, res: Response) => {
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

    const deleteProducts = await Product.findAll({
      where: {
        deletedAt: { [Op.ne]: null },
      },
      paranoid: false,
    });
    let counter = deleteProducts.length;

    for (const product of deleteProducts) {
      console.log(`${counter} products left. Current ${product.id}`);
      counter--;

      // Handle request products
      await RequestProduct.update(
        {
          reserveName: product.name_ru,
          reserveManufacturer: product.manufacturer,
          reserveArticle: product.article,
        },
        {
          where: {
            productId: product.id,
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
