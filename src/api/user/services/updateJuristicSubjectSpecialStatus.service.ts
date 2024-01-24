import httpStatus from 'http-status';
import { ServiceError } from '../../../core/utils/serviceError';
import JuristicSubject from '../models/JuristicSubject.model';
import { Transaction } from 'sequelize';
import OrderRequest from '../../order/models/OrderRequest.model';
import { Op } from 'sequelize';
import JuristicSubjectCustomer from '../models/JuristicSubjectCustomer.model';
import User from '../models/User.model';

interface IProps {
  id: JuristicSubject['id'];
  isSpecialClient: boolean;
}

export const updateJuristicSubjectSpecialStatusService = async (
  { id, isSpecialClient }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  let juristicSubject = await JuristicSubject.findByPk(id, { transaction });
  if (!juristicSubject)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Организация не найдена',
    });

  const activeOrderRequest = await OrderRequest.findOne({
    where: {
      payerId: juristicSubject.id,
      status: { [Op.notIn]: ['DECLINED', 'COMPLETED'] },
    },
    transaction,
  });
  if (!!activeOrderRequest)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'На организации есть активные заказы',
    });

  // Update JuristicSubject
  juristicSubject = await juristicSubject.update({ isSpecialClient }, { transaction });

  const orgCustomers = await JuristicSubjectCustomer.findAll({
    where: {
      juristicSubjectId: juristicSubject.id,
    },
    transaction,
  });
  for (const orgCustomer of orgCustomers) {
    // Find all customer user organizations (JuristicSubject[])
    const otherUserOrgCustomers = await JuristicSubjectCustomer.findAll({
      where: {
        juristicSubjectId: { [Op.ne]: juristicSubject.id },
        userId: orgCustomer.userId,
      },
      transaction,
    });
    const otherUserOrgs = !!otherUserOrgCustomers?.length
      ? await JuristicSubject.findAll({
          where: {
            id: otherUserOrgCustomers.map(el => el.juristicSubjectId),
          },
          transaction,
        })
      : [];
    const allUserOrgs = [juristicSubject, ...otherUserOrgs];
    // Update customer user special client status
    await User.update(
      {
        isSpecialClient: allUserOrgs.some(org => org.isSpecialClient),
      },
      {
        where: {
          id: orgCustomer.userId,
        },
        limit: 1,
        transaction,
      },
    );
  }

  return juristicSubject;
};
