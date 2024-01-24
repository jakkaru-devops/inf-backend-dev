import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import Product from '../../catalog/models/Product.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import AutoTypeBrandRelations from '../../catalog/models/relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from '../../catalog/models/relations/AutoTypeGroupRelations.model';
import AutoModel from '../../catalog/models/AutoModel.model';
import AutoBrandGroupRelations from '../../catalog/models/relations/AutoBrandGroupRelations.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import { PRODUCT_STATUSES } from '../../catalog/data';
import { Op } from 'sequelize';
import AutoBrand from '../../catalog/models/AutoBrand.model';

export const fixProductsBranchesService = async (req: Request, res: Response) => {
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
      // limit: 1000,
    });
    const allAutoBrands = await AutoBrand.findAll();
    console.log('ALL PRODUCTS COUNT', allProducts.length);

    let counter = allProducts.length;

    for (const productData of allProducts) {
      counter--;
      console.log(`${counter} products remain ${productData.id}`);

      const product = await Product.findByPk(productData.id);
      const branches = await ProductBranch.findAll({
        where: {
          productId: product.id,
          status: PRODUCT_STATUSES.DEFAULT,
        },
      });

      let selectedBranch: ProductBranch = null;
      for (const branch of branches) {
        if (!!branch?.autoTypeId && !branch?.autoBrandId && !selectedBranch) selectedBranch = branch;
        if (
          !!selectedBranch &&
          !!branch?.autoTypeId &&
          branch?.autoTypeId !== selectedBranch?.autoTypeId &&
          !branch?.autoBrandId
        )
          selectedBranch = null;
      }

      let matchedBranches: ProductBranch[] = [];
      if (!!selectedBranch) {
        for (const branch of branches) {
          if (branch?.id === selectedBranch?.id || !!branch?.autoTypeId) continue;
          if (
            !!branch?.autoBrandId &&
            ((!branch?.groupId && !selectedBranch?.groupId) ||
              (branch?.groupId === selectedBranch?.groupId &&
                ((!branch?.subgroupId && !selectedBranch?.subgroupId) ||
                  branch?.subgroupId === selectedBranch?.subgroupId)))
          ) {
            const autoBrand = allAutoBrands.find(el => el.id === branch?.autoBrandId);
            if (!autoBrand) continue;
            const activeAutoTypes = JSON.parse(autoBrand?.activeAutoTypeIds || '[]') as string[];
            if (!activeAutoTypes.includes(selectedBranch?.autoTypeId)) continue;
            matchedBranches.push(branch);
          }
        }

        for (const branch of matchedBranches) {
          await branch.update({
            autoTypeId: selectedBranch?.autoTypeId,
          });
        }
        await selectedBranch.destroy({ force: true });
      }
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
