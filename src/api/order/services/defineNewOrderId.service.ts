import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import OrderRequest from '../models/OrderRequest.model';

export const defineNewOrderIdService = async (
  { user }: { user: User },
  { transaction }: { transaction: Transaction },
) => {
  const customerRequestsCount = await OrderRequest.count({
    where: { customerId: user.id },
    paranoid: false,
    transaction,
  });
  return [user.idInt, customerRequestsCount + 1].join('-');
};
