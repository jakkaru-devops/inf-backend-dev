import { Transaction } from 'sequelize';
import Organization from '../../organization/models/Organization.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import User from '../../user/models/User.model';
import Product from '../models/Product.model';
import { Op } from 'sequelize';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import Warehouse from '../models/Warehouse.model';
import StockBalance from '../models/StockBalance.model';
import catalogService from '../catalog.service';
import organizationsService from '../../organization/organizations.service';

interface IProps {
  priceOfferId: StockBalance['id'];
  product?: Product;
  sellerId: User['id'];
  organizationId: Organization['id'];
  price: number;
  previousPrice: number;
  amount: number;
  relevance?: Date;
  brand?: string;
  nameInPrice?: string;
}

export const updateProductPriceOfferService = async (
  {
    priceOfferId,
    product,
    sellerId,
    organizationId,
    price,
    previousPrice,
    amount,
    relevance,
    brand,
    nameInPrice,
  }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const priceOffer = await StockBalance.findByPk(priceOfferId, { transaction });
  const productId = priceOffer?.productId;
  if (!priceOffer) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Цена для товара отсутствует' });

  if (!amount || amount < 1)
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Некорректное количество товара' });

  if (!product) product = await Product.findByPk(productId, { transaction });
  if (!product || productId !== product?.id)
    throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Товар не найден' });

  const currentWarehouse = await Warehouse.findByPk(priceOffer.warehouseId, { transaction });
  const currentOrgSeller = await OrganizationSeller.findOne({
    where: {
      organizationId: currentWarehouse.organizationId,
      userId: sellerId,
      confirmationDate: { [Op.ne]: null },
      detachedAt: null,
    },
    transaction,
  });
  if (!currentOrgSeller || (product.userId !== sellerId && priceOffer.userId !== sellerId))
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Недостаточно прав' });

  if (!brand) brand = product.manufacturer;
  if (!relevance) relevance = new Date();

  const updateData = {
    warehouseId: priceOffer.warehouseId,
    price,
    previousPrice,
    amount,
    relevance,
    brand,
    nameInPrice,
  };

  if (organizationId !== currentWarehouse.organizationId) {
    const { organizationSeller: newOrgSeller, organizationBranch: newOrgBranch } =
      await organizationsService.getOrganizationSellerData(
        {
          userId: sellerId,
          organizationId,
        },
        { transaction },
      );
    const [newWarehouse] = await Warehouse.findOrCreate({
      where: {
        organizationId,
        sellerId,
      },
      defaults: {
        organizationId,
        sellerId,
        addressId: newOrgBranch.actualAddressId,
      },
      transaction,
    });

    updateData.warehouseId = newWarehouse.id;
  }

  await priceOffer.update(updateData, { transaction });
  priceOffer.organizationId = organizationId;

  await catalogService.updateProductMinPrice({ productId: product.id }, { transaction });

  return priceOffer;
};
