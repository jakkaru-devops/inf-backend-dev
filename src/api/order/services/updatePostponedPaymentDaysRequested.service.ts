import { Transaction } from 'sequelize';
import { PostponedPayment } from '../models/PostponedPayment.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import User from '../../user/models/User.model';

interface IProps {
  id: PostponedPayment['id'];
  customerId: User['id'];
  daysRequested: number;
}

export const updatePostponedPaymentDaysRequestedService = async (
  { id, customerId, daysRequested }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const postponedPayment = await PostponedPayment.findByPk(id, { transaction });
  if (!postponedPayment)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Запрос на отсрочку платежа не найден',
    });
  if (postponedPayment.customerId !== customerId)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Недостаточно прав',
    });

  const updateData: any = {
    daysRequested,
  };

  if (daysRequested > 0) {
    if (['APPROVED', 'REJECTED'].includes(postponedPayment.status)) {
      updateData.status = 'PENDING';
    }
  }

  await postponedPayment.update(updateData, { transaction });

  return postponedPayment;
};
