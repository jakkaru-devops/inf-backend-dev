import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import Product from '../../catalog/models/Product.model';
import ProductAnalogs from '../../catalog/models/ProductAnalogs.model';
import ProductApplicability from '../../catalog/models/ProductApplicability.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import AutoType from '../../catalog/models/AutoType.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import ProductAutoTypeRelations from '../../catalog/models/relations/ProductAutoTypeRelations.model';
import ProductAutoBrandRelations from '../../catalog/models/relations/ProductAutoBrandRelations.model';

export const transformAllProductGroupsService = async (req: Request, res: Response) => {
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
    const autoTypes = await AutoType.findAll({
      attributes: ['id'],
    });
    const autoBrands = await AutoBrand.findAll({
      attributes: ['id'],
    });
    const allGroups = await ProductGroup.findAll({
      attributes: ['id'],
      where: {
        nestingLevel: [0, 1],
      },
    });
    console.log('ALL GROUPS COUNT', allGroups.length);

    let counter = allGroups.length;

    for (const groupData of allGroups) {
      counter--;
      console.log(`${counter} groups remain ${groupData.id}`);

      const group = await ProductGroup.findByPk(groupData.id);
      let activeAutoTypeIds: string[] = [];
      let activeAutoBrandIds: string[] = [];

      for (const autoType of autoTypes) {
        const relation = await ProductAutoTypeRelations.findOne({
          where: {
            autoTypeId: autoType.id,
          },
        });
        if (!!relation) activeAutoTypeIds.push(autoType.id);
      }
      for (const autoBrand of autoBrands) {
        const relation = await ProductAutoBrandRelations.findOne({
          where: {
            autoBrandId: autoBrand.id,
          },
        });
        if (!!relation) activeAutoBrandIds.push(autoBrand.id);
      }

      await group.update({
        activeAutoTypeIds: JSON.stringify(activeAutoTypeIds),
        activeAutoBrandIds: JSON.stringify(activeAutoBrandIds),
      });
    }

    const endTime = new Date().getTime();

    console.log(`Groups transformation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'The groups transformation has been successfully completed',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while product groups transformation',
      error: err,
    });
  }
};
