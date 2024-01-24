import { Transaction } from 'sequelize';
import Product from '../../catalog/models/Product.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import CartProduct from '../models/CartProduct.model';
import User from '../../user/models/User.model';

interface IProps {
  productId: Product['id'];
  quantity: number;
  priceOfferId?: StockBalance['id'];
  isSelected?: boolean;
  deliveryMethod?: string;
  userId: User['id'];
}

export const updateCartProductService = async (
  { productId, quantity, priceOfferId, isSelected, deliveryMethod, userId }: IProps,
  params?: { transaction: Transaction },
) => {
  const transaction = params?.transaction;

  if (!quantity)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: `Некорректное количество товара - ${quantity}`,
    });

  let cartProduct = await CartProduct.findOne({
    where: {
      productId,
      userId,
      priceOfferId: priceOfferId || null,
    },
    transaction,
  });

  if (!cartProduct)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: `Товар еще не добавлен в корзину`,
    });

  cartProduct = await cartProduct.update(
    {
      quantity,
      isSelected,
      deliveryMethod,
    },
    { transaction },
  );

  return cartProduct;
};
