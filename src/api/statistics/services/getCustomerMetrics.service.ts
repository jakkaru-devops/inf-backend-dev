import httpStatus from 'http-status';
import { ServiceError } from '../../../core/utils/serviceError';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import { Op } from 'sequelize';
import addDate from 'date-fns/add';
import formatDate from 'date-fns/format';
import isDateWithinInterval from 'date-fns/isWithinInterval';
import moment from 'moment';
import { getOrgName } from '../../organization/utils';
import { compareDesc } from 'date-fns';

interface IProps {
  organizationId: JuristicSubject['id'];
  requests?: OrderRequest[];
  orders?: OrderRequest[];
}

export const getCustomerMetricsService = async ({
  organizationId,
  requests: requestsInitial,
  orders: ordersInitial,
}: IProps) => {
  const organization = (
    await JuristicSubject.findByPk(organizationId, { attributes: ['id', 'name', 'entityType', 'entityCode'] })
  )?.toJSON() as JuristicSubject;
  if (!organization)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Покупатель не найден',
    });

  organization.name = getOrgName(organization, true, true);

  const allRequests =
    requestsInitial ||
    (await OrderRequest.findAll({
      where: {
        payerId: organization.id,
        [Op.or]: [
          {
            status: {
              [Op.in]: ['REQUESTED', 'APPROVED'] as Array<OrderRequest['status']>,
            },
          },
          {
            status: 'DECLINED',
            paymentDate: null,
          },
        ],
      },
    }));
  const allOrders =
    ordersInitial ||
    (await OrderRequest.findAll({
      where: {
        payerId: organization.id,
        [Op.or]: [
          {
            status: {
              [Op.in]: ['PAID', 'PAYMENT_POSTPONED', 'COMPLETED'] as Array<OrderRequest['status']>,
            },
          },
          {
            status: 'DECLINED',
            paymentDate: { [Op.ne]: null },
          },
        ],
      },
    }));

  const groupsByWeeks: { [key: string]: { requests: OrderRequest[]; orders: OrderRequest[] } } = {};

  const getWeekKeyByDate = (dateStr: Date | string) => {
    const date = moment(dateStr).toDate();
    const dateWeekStart = addDate(date, { days: -(date.getDay() - 1) }).setHours(0, 0, 0, 0);
    return formatDate(dateWeekStart, 'yyyy-MM-dd');
  };

  for (const request of allRequests) {
    const weekKey = getWeekKeyByDate(request.createdAt);

    if (!groupsByWeeks?.[weekKey]) {
      groupsByWeeks[weekKey] = {
        requests: [],
        orders: [],
      };
    }

    groupsByWeeks[weekKey].requests.push(request);
  }
  for (const order of allOrders) {
    const weekKey = getWeekKeyByDate(order?.paymentDate || order.createdAt);

    if (!groupsByWeeks?.[weekKey]) {
      groupsByWeeks[weekKey] = {
        requests: [],
        orders: [],
      };
    }

    groupsByWeeks[weekKey].orders.push(order);
  }

  const arrayDate: Date[] = [];

  Object.keys(groupsByWeeks).forEach((weekKey: string) => {
    arrayDate.push(moment(weekKey).toDate());
  });

  const sortDateArray: string[] = arrayDate.sort(compareDesc).map(date => formatDate(date, 'yyyy-MM-dd'));

  const weeks: Array<{
    weekStart: Date;
    weekEnd: Date;
    requestsNumber: number;
    ordersNumber: number;
    totalOrdersSum: number;
  }> = [];

  for (let i = 0; i < sortDateArray.length; ++i) {
    const dateWeekStart = moment(sortDateArray[i]).toDate();
    const dateWeekEnd = addDate(dateWeekStart, { days: 7, seconds: -1 });

    const requests = allRequests.filter(request =>
      isDateWithinInterval(moment(request.createdAt).toDate(), { start: dateWeekStart, end: dateWeekEnd }),
    );
    const orders = allOrders.filter(order =>
      isDateWithinInterval(moment(order?.paymentDate || order.createdAt).toDate(), {
        start: dateWeekStart,
        end: dateWeekEnd,
      }),
    );
    const totalOrdersSum = orders.map(order => order?.totalPrice || 0).reduce((a, b) => a + b, 0);

    weeks.push({
      weekStart: dateWeekStart,
      weekEnd: dateWeekEnd,
      requestsNumber: requests.length,
      ordersNumber: orders.length,
      totalOrdersSum,
    });
  }

  return {
    organization,
    requestsNumber: allRequests.length,
    ordersNumber: allOrders.length,
    weeks,
  };
};
