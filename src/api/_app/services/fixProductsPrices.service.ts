import { Request, Response } from 'express';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import Product from '../../catalog/models/Product.model';
import { FindOptions, Op } from 'sequelize';
import { formatDistance } from 'date-fns';
import { PUBLIC_PRODUCT_STATUSES } from '../../catalog/data';

export const fixProductsPricesService = async (req: Request, res: Response) => {
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

    const commonOptions: FindOptions = {
      attributes: [
        'id',
        'name_ru',
        'pureName',
        'article',
        'articleSimplified',
        'status',
        'mainProductId',
        'minPrice',
        'hasPrice',
        'createdAt',
      ],
      order: [
        ['article', 'ASC'],
        ['createdAt', 'ASC'],
      ],
    };

    const totalCount = await Product.count({
      where: {
        status: PUBLIC_PRODUCT_STATUSES,
      },
    });
    let counter = totalCount;
    const limit = 10000;
    const steps = Array.from({ length: Math.ceil(totalCount / limit) }, (value, index) => index);
    const offsets = steps.map(step => step * limit);

    console.log('TOTAL COUNT', totalCount);
    console.log('OFFSETS', offsets);

    // Step 1
    for (const offset of offsets) {
      const allProducts = await Product.findAll({
        ...commonOptions,
        where: {
          status: PUBLIC_PRODUCT_STATUSES,
        },
        offset,
        limit,
      });

      for (const product of allProducts) {
        counter--;
        if (counter % 1000 === 0) console.log(`${counter} items left. Current ${product.id}`);

        const minPrice = product.minPrice === Infinity ? null : product.minPrice;

        await product.update({
          minPrice,
          hasPrice: !!minPrice,
        });
      }
    }

    const endTime = new Date().getTime();

    console.log(`Operation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Success',
    });
  } catch (err) {
    console.error(err);
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Fail',
      error: err,
    });
  }
};
