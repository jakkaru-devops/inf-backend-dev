import { Transaction } from 'sequelize';
import Organization from '../../organization/models/Organization.model';
import User from '../../user/models/User.model';
import Product from '../models/Product.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import Warehouse from '../models/Warehouse.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import StockBalance from '../models/StockBalance.model';
import catalogService from '../catalog.service';

interface IProps {
  productId: Product['id'];
  product?: Product;
  userId: User['id'];
  organizationId: Organization['id'];
  organizationBranch: OrganizationBranch;
  price: number;
  previousPrice: number;
  amount: number;
  relevance?: Date;
  brand?: string;
  nameInPrice?: string;
  forSale?: boolean;
}

export const createProductPriceOfferService = async (
  {
    productId,
    product,
    userId,
    organizationId,
    organizationBranch,
    price,
    previousPrice,
    amount,
    relevance,
    brand,
    nameInPrice,
    forSale,
  }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  if (!amount || amount < 1)
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Некорректное количество товара' });

  if (!product) product = await Product.findByPk(productId, { transaction });
  if (!product || productId !== product?.id)
    throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Товар не найден' });

  const [warehouse] = await Warehouse.findOrCreate({
    where: {
      organizationId,
      sellerId: userId,
    },
    defaults: {
      organizationId,
      sellerId: userId,
      addressId: organizationBranch.actualAddressId,
    },
    transaction,
  });

  if (!brand) brand = product.manufacturer;
  if (!relevance) relevance = new Date();

  const priceOffer = await StockBalance.create(
    {
      warehouseId: warehouse.id,
      productId,
      userId,
      price,
      previousPrice,
      amount,
      relevance,
      brand,
      nameInPrice,
      forSale,
    },
    { transaction },
  );
  priceOffer.organizationId = organizationId;

  await catalogService.updateProductMinPrice({ productId }, { transaction });

  return priceOffer;
};
