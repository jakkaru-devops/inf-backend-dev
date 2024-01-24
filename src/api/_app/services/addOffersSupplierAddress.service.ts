import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';
import Order from '../../order/models/Order.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Address from '../../address/models/Address.model';
import { ADMIN_ACCESS_KEY } from '../../../config/env';

export const addOffersSupplierAddressService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const offers = await Order.findAll();

    for (const offer of offers) {
      const orgSeller = await OrganizationSeller.findOne({
        where: {
          organizationId: offer.organizationId,
          userId: offer.sellerId,
        },
      });
      const supplierBranch = await OrganizationBranch.findByPk(orgSeller.branchId);
      const supplierAddress = await Address.findByPk(supplierBranch.actualAddressId);
      if (!supplierAddress) continue;

      await offer.update({
        supplierAddressId: supplierAddress.id,
      });
    }

    return res.status(httpStatus.OK).json({
      message: 'Offers successfully initialized',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while adding offers supplierAddressId',
      error: err,
    });
  }
};
