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

export const fillProductsTagsJsonService = async (req: Request, res: Response) => {
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

    const products = await Product.findAll({
      attributes: ['id', 'article'],
    });
    let counter = products.length;

    for (const product of products) {
      console.log(`${counter} products left. Current ${product.id}`);
      counter--;

      const branches = await ProductBranch.findAll({
        where: {
          productId: product.id,
          status: PUBLIC_PRODUCT_STATUSES,
        },
        attributes: ['id', 'tag'],
      });
      const tagsJson = _.uniq(
        branches
          .map(branch => branch?.tag?.trim())
          .filter(Boolean)
          .map(tag => simplifyProductName(tag, product.article)),
      );
      await product.update({ tagsJson: JSON.stringify(tagsJson) });
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
