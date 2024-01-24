import { Transaction } from 'sequelize';
import { PostponedPayment } from '../models/PostponedPayment.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import User from '../../user/models/User.model';
import Warehouse from '../../catalog/models/Warehouse.model';

interface IProps {
  id: PostponedPayment['id'];
  sellerId: User['id'];
  daysApproved: number;
  maxSum: number;
}

export const updatePostponedPaymentService = async (
  { id, sellerId, daysApproved, maxSum }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const postponedPayment = await PostponedPayment.findByPk(id, {
    include: [{ model: Warehouse, as: 'warehouse', required: true }],
    transaction,
  });
  if (!postponedPayment)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Запрос на отсрочку платежа не найден',
    });
  if (postponedPayment.warehouse.sellerId !== sellerId)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Недостаточно прав',
    });

  await postponedPayment.update(
    {
      status: daysApproved > 0 ? 'APPROVED' : 'REJECTED',
      daysApproved,
      maxSum,
    },
    { transaction },
  );

  return postponedPayment;
};
