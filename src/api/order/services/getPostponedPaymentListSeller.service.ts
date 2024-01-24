import { Op } from 'sequelize';
import User from '../../user/models/User.model';
import { PostponedPayment } from '../models/PostponedPayment.model';
import { IPaginationParams } from '../../../interfaces/common.interfaces';
import { getPaginationParams } from '../../../utils/common.utils';
import Warehouse from '../../catalog/models/Warehouse.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';

interface IProps {
  userId: User['id'];
  pagination: IPaginationParams;
}

export const getPostponedPaymentListSellerService = async ({ userId, pagination }: IProps) => {
  const warehouses = await Warehouse.findAll({
    where: {
      sellerId: userId,
    },
  });
  const postponedPayments = await PostponedPayment.findAndCountAll({
    ...getPaginationParams(pagination, 10),
    where: {
      warehouseId: { [Op.in]: warehouses.map(el => el.id) },
    },
    include: [{ model: JuristicSubject, as: 'customerOrganization', required: true }],
    order: [['createdAt', 'DESC']],
  });
  return postponedPayments;
};
