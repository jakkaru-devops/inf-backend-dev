import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import Product from '../models/Product.model';
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
  preventMinPriceUpdate?: boolean;
}

export const deleteProductPriceOfferService = async (
  { priceOfferId, product, sellerId, preventMinPriceUpdate }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const priceOffer = await StockBalance.findByPk(priceOfferId, { transaction });
  const productId = priceOffer?.productId;
  if (!priceOffer) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Цена для товара отсутствует' });

  if (!product) product = await Product.findByPk(productId, { transaction });
  if (!product || productId !== product?.id)
    throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Товар не найден' });

  const warehouse = await Warehouse.findByPk(priceOffer.warehouseId, { transaction });

  const { organizationSeller } = await organizationsService.getOrganizationSellerData(
    {
      userId: sellerId,
      organizationId: warehouse.organizationId,
    },
    { transaction },
  );

  if (!organizationSeller || (product.userId !== sellerId && priceOffer.userId !== sellerId))
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Недостаточно прав' });

  // Delete entity
  await priceOffer.destroy({ force: true, transaction });

  if (!preventMinPriceUpdate) await catalogService.updateProductMinPrice({ productId }, { transaction });

  return priceOffer;
};
