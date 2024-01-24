import httpStatus from 'http-status';
import OrderRequest from '../models/OrderRequest.model';
import { Transaction } from 'sequelize';
import { ServiceError } from '../../../core/utils/serviceError';
import User from '../../user/models/User.model';

interface IProps {
  authUserId: User['id'];
  orderId: OrderRequest['id'];
}

export const toggleOrderDeleteStatusService = async (
  { authUserId, orderId }: IProps,
  { transaction }: { transaction: Transaction },
): Promise<{ isDeleted: boolean }> => {
  const order = await OrderRequest.findByPk(orderId, { transaction });

  if (!order) throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Заказ не найден' });

  if (!['REQUESTED', 'APPROVED'].includes(order.status))
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Удаление заказа недоступно' });

  const nowDate = new Date();

  if (!order?.managerDeletedAt) {
    await order.update(
      {
        deletedManagerId: authUserId,
        managerDeletedAt: nowDate,
      },
      { transaction },
    );
  } else {
    await order.update(
      {
        deletedManagerId: null,
        managerDeletedAt: null,
      },
      { transaction },
    );
  }

  return {
    isDeleted: !!order?.managerDeletedAt,
  };
};
