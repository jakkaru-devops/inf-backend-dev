import { Transaction } from 'sequelize';
import Warehouse from '../../catalog/models/Warehouse.model';
import User from '../../user/models/User.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import CartProduct from '../models/CartProduct.model';
import { ServiceError } from '../../../core/utils/serviceError';
import { NOT_FOUND } from 'http-status';

interface IProps {
  warehouseId: Warehouse['id'];
  userId: User['id'];
  deliveryMethod: string;
}

export const updateCartOfferService = async (
  { warehouseId, userId, deliveryMethod }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const cartProducts = await CartProduct.findAll({
    where: {
      userId,
    },
    include: [
      {
        model: StockBalance,
        as: 'priceOffer',
        where: { warehouseId },
        required: true,
      },
    ],
    transaction,
  });

  if (!cartProducts?.length) throw new ServiceError({ status: NOT_FOUND, message: 'Предложение не найдено' });

  for (const cartProduct of cartProducts) {
    await cartProduct.update({ deliveryMethod }, { transaction });
  }

  return cartProducts;
};
