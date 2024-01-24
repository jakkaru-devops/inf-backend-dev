import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import { PRODUCT_STATUSES } from '../../catalog/data';
import Product from '../../catalog/models/Product.model';
import formatDistance from 'date-fns/formatDistance';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import catalogService from '../../catalog/catalog.service';

export const addMissingProductMainBranchesService = async (req: Request, res: Response) => {
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
      where: {
        branchCategoriesJson: '[]',
      },
      attributes: ['id', 'branchCategoriesJson'],
    });
    let counter = products.length;
    let skippedProductsCount = 0;
    console.log('PRODUCTS COUNT', counter);

    for (const { id } of products) {
      console.log('Remaining ' + counter);
      counter--;

      const product = await Product.findByPk(id);
      const branch = await ProductBranch.findOne({
        where: {
          productId: product.id,
        },
        attributes: ['id', 'productId'],
      });
      if (!!branch) {
        skippedProductsCount++;
        console.log('Skipped products count ' + skippedProductsCount);
        continue;
      }
      await catalogService.createProductBranch(
        {
          productId: product.id,
          userId: null,
          sourceBranchId: null,
          status: PRODUCT_STATUSES.DEFAULT,
          isMain: true,
          tag: product?.name_ru,
          description: product?.description_ru,
          manufacturer: product?.manufacturer,
          autoTypeId: JSON.parse(product?.autoTypeIds || '[]')?.[0] || null,
          autoBrandId: JSON.parse(product?.autoBrandIds || '[]')?.[0] || null,
          autoModelIds: JSON.parse(product?.autoModelIds || '[]'),
          groupId: JSON.parse(product?.groupIds || '[]')?.[0] || null,
          subgroupId: JSON.parse(product?.subgroupIds || '[]')?.[0] || null,
          name: product.name_ru,
          article: product.article,
          articleSimplified: product.articleSimplified,
        },
        { transaction: null },
      );
    }

    const endTime = new Date().getTime();
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
