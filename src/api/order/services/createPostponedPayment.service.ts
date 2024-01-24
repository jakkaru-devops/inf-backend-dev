import { Transaction } from 'sequelize';
import Warehouse from '../../catalog/models/Warehouse.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import User from '../../user/models/User.model';
import { PostponedPayment } from '../models/PostponedPayment.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  customerId: User['id'];
  customerOrganizationId: JuristicSubject['id'];
  warehouseId: Warehouse['id'];
  daysRequested: number;
}

export const createPostponedPaymentService = async (
  { customerId, customerOrganizationId, warehouseId, daysRequested }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  let postponedPayment = await PostponedPayment.findOne({
    where: {
      customerOrganizationId,
      warehouseId,
    },
    transaction,
  });
  if (!!postponedPayment)
    throw new ServiceError({
      status: httpStatus.CONFLICT,
      message: 'Запрос на отсрочку уже создан ранее',
    });

  const warehouse = await Warehouse.findByPk(warehouseId, { transaction });

  postponedPayment = await PostponedPayment.create(
    {
      customerId,
      customerOrganizationId,
      organizationId: warehouse.organizationId,
      warehouseId,
      status: 'PENDING',
      daysRequested,
    },
    { transaction },
  );

  return postponedPayment;
};
