import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import Product from '../../catalog/models/Product.model';
import ProductAnalogs from '../../catalog/models/ProductAnalogs.model';
import ProductApplicability from '../../catalog/models/ProductApplicability.model';

export const transformProductAnalogsAndApplicabilitiesService = async (req: Request, res: Response) => {
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
    const allProducts = await Product.findAll({
      attributes: ['id'],
      // limit: 100,
    });
    console.log('ALL PRODUCTS COUNT', allProducts.length);
    let a = 0;

    let counter = allProducts.length;

    for (const productData of allProducts) {
      counter--;
      console.log(`${counter} products remain ${productData.id}`);

      const product = await Product.findByPk(productData.id);
      const analog = await ProductAnalogs.findOne({
        where: {
          productId: product.id,
        },
        order: [['createdAt', 'ASC']],
        attributes: [],
      });
      product.hasAnalogs = !!analog;
      const applicability = await ProductApplicability.findOne({
        where: {
          productId: product.id,
        },
        order: [['createdAt', 'ASC']],
        attributes: [],
      });
      product.hasApplicabilities = !!applicability;

      await product.update({
        hasAnalogs: !!analog,
        hasApplicabilities: !!applicability,
      });
    }

    const endTime = new Date().getTime();
    console.log('CARS COUNT', a);

    console.log(`Products transformation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'The products transformation has been successfully completed',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while products transformation',
      error: err,
    });
  }
};
