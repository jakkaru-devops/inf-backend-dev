import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  orderId: OrderRequest['id'];
  offerId: Order['id'];
  sellerId: User['id'];
  paymentPostponeOverMaxSumApproved: boolean;
}

export const approveOfferPostponedPaymentService = async (
  { orderId, offerId, sellerId, paymentPostponeOverMaxSumApproved }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });
  const offer = await Order.findByPk(offerId, { transaction });

  if (!order || !offer || offer.orderRequestId !== orderId || offer.sellerId !== sellerId)
    throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Заказ не найден' });
  if (!offer?.paymentPostponedAt)
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Отсрочка оплаты не была запрошена' });

  await offer.update({ paymentPostponeOverMaxSumApproved }, { transaction });

  return offer;
};
