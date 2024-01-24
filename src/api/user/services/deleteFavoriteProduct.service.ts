import { Transaction } from 'sequelize';
import Product from '../../catalog/models/Product.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import User from '../models/User.model';
import FavoriteProduct from '../../catalog/models/FavoriteProduct.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  userId: User['id'];
  productId: Product['id'];
  priceOfferId?: StockBalance['id'];
}

export const deleteFavoriteProductService = async (
  { userId, productId, priceOfferId }: IProps,
  params?: { transaction: Transaction },
) => {
  const transaction = params?.transaction;

  console.log('test', {
    userId,
    productId,
    priceOfferId: priceOfferId || null,
  });

  let favoriteProduct = await FavoriteProduct.findOne({
    where: {
      userId,
      productId,
      priceOfferId: priceOfferId || null,
    },
    transaction,
  });

  if (!favoriteProduct)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: `Товара нет в избранных`,
    });

  await favoriteProduct.destroy({
    force: true,
    transaction,
  });

  return favoriteProduct;
};
