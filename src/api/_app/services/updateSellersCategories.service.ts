import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import User from '../../user/models/User.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';

export const updateSellersCategoriesService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const users = await User.findAll();
    let count = users.length;

    const startTime = new Date().getTime();

    for (const user of users) {
      console.log(`Count remaining - ${count}, ${user.id}`);
      count--;

      const sellerAutoBrands = await SellerAutoBrands.findAll({
        where: {
          userId: user.id,
        },
      });
      const sellerAutoBrandsJson = !!sellerAutoBrands?.length
        ? JSON.stringify(
            sellerAutoBrands.map(item => ({
              autoTypeId: item.autoTypeId,
              autoBrandId: item.autoBrandId,
            })),
          )
        : null;

      const sellerProductGroups = await SellerProductGroups.findAll({
        where: {
          userId: user.id,
        },
      });
      const sellerProductGroupsJson = !!sellerProductGroups?.length
        ? JSON.stringify(sellerProductGroups.map(item => item.productGroupId))
        : null;

      await user.update({
        sellerAutoBrandsJson,
        sellerProductGroupsJson,
      });
    }

    const endTime = new Date().getTime();

    console.log(
      `Sellers categories update took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`,
    );

    return res.status(httpStatus.OK).json({
      message: 'Sellers categories update has been successfully completed',
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
