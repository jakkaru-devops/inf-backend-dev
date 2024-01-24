import { Op } from 'sequelize';
import JuristicSubjectCustomer from '../../user/models/JuristicSubjectCustomer.model';
import User from '../../user/models/User.model';
import { PostponedPayment } from '../models/PostponedPayment.model';
import { IPaginationParams } from '../../../interfaces/common.interfaces';
import { getPaginationParams } from '../../../utils/common.utils';
import Organization from '../../organization/models/Organization.model';

interface IProps {
  userId: User['id'];
  pagination: IPaginationParams;
}

export const getPostponedPaymentListCustomerService = async ({ userId, pagination }: IProps) => {
  const orgCustomers = await JuristicSubjectCustomer.findAll({
    where: {
      userId,
    },
  });
  const postponedPayments = await PostponedPayment.findAndCountAll({
    ...getPaginationParams(pagination, 10),
    where: {
      customerOrganizationId: { [Op.in]: orgCustomers.map(el => el.juristicSubjectId) },
    },
    include: [{ model: Organization, as: 'organization', required: true }],
    order: [['createdAt', 'DESC']],
  });
  return postponedPayments;
};
