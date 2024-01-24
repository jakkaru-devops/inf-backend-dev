import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import AutoType from '../../catalog/models/AutoType.model';
import Product from '../../catalog/models/Product.model';

export const transformAutoBrandsService = async (req: Request, res: Response) => {
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

    const autoBrands = await AutoBrand.findAll({
      include: [
        {
          model: AutoType,
          as: 'autoTypes',
        },
      ],
    });
    let counter = autoBrands.length;

    for (const autoBrand of autoBrands) {
      counter--;
      console.log(`${counter} auto brands remain. Current - ${autoBrand.label}`);

      const activeAutoTypeIds: string[] = [];
      for (const autoType of autoBrand.autoTypes) {
        const productsCount = await Product.count({
          include: [
            {
              model: AutoType,
              as: 'autoTypes',
              required: true,
              where: {
                id: autoType.id,
              },
            },
            {
              model: AutoBrand,
              as: 'autoBrands',
              required: true,
              where: {
                id: autoBrand.id,
              },
            },
          ],
        });
        if (!!productsCount) {
          activeAutoTypeIds.push(autoType.id);
        }
      }

      await autoBrand.update({
        activeAutoTypeIds: JSON.stringify(activeAutoTypeIds),
      });
    }

    const endTime = new Date().getTime();

    console.log(`Products transfer took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Auto brands have been transformed',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while auto brands transformation',
      error: err,
    });
  }
};
