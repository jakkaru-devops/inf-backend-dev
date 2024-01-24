import { Transaction } from 'sequelize';
import Product from '../../catalog/models/Product.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import CartProduct from '../models/CartProduct.model';
import User from '../../user/models/User.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  productId: Product['id'];
  priceOfferId?: StockBalance['id'];
  userId: User['id'];
}

export const deleteCartProductService = async (
  { productId, priceOfferId, userId }: IProps,
  params?: { transaction: Transaction },
) => {
  const transaction = params?.transaction;

  const cartProduct = await CartProduct.findOne({
    where: {
      userId,
      productId,
      priceOfferId: priceOfferId || null,
    },
    transaction,
  });

  if (!cartProduct) {
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: `Товар еще не добавлен в корзину`,
    });
  }

  await cartProduct.destroy({
    force: true,
  });

  return cartProduct;
};
