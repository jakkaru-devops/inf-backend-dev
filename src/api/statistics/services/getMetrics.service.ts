import seq, { Op } from 'sequelize';
import Organization from '../../organization/models/Organization.model';
import addDate from 'date-fns/add';
import UserRoles from '../../role/models/UserRoles.model';
import Role from '../../role/models/Role.model';
import User from '../../user/models/User.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import { gaussRound } from '../../../utils/common.utils';

type IMetricLabel =
  | 'suppliersTotal'
  | 'suppliersWeek'
  | 'sellersTotal'
  | 'sellersWeek'
  | 'customerOrganizationsTotal'
  | 'customerOrganizationsWeek'
  | 'customersTotal'
  | 'customersWeek'
  | 'requestsTotal'
  | 'requestsWeek'
  | 'rejectedRequestsTotal'
  | 'rejectedRequestsWeek'
  | 'ordersTotal'
  | 'ordersWeek'
  | 'rejectedOrdersTotal'
  | 'rejectedOrdersWeek'
  | 'requestsIndividualsTotal'
  | 'requestsIndividualsWeek'
  | 'ordersIndividualsTotal'
  | 'ordersIndividualsWeek';

export const getMetricsService = async () => {
  const nowDate = new Date();
  const dateWeekStart = addDate(nowDate, { days: -(nowDate.getDay() - 1) }).setHours(0, 0, 0, 0);
  const afterWeekStart = { [Op.gte]: dateWeekStart };
  const customerRole = await Role.findOne({ where: { label: 'customer' } });

  const where = {
    requests: {
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
    rejectedRequests: {
      status: 'DECLINED',
      paymentDate: null,
    },
    orders: {
      [Op.and]: [
        {
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
      ],
    },
    rejectedOrders: {
      status: 'DECLINED',
      paymentDate: { [Op.ne]: null },
    },
  };

  const promises: { [key in IMetricLabel]: seq.Promise<number> } = {
    suppliersTotal: Organization.count({
      where: {
        confirmationDate: { [Op.ne]: null },
      },
    }),
    suppliersWeek: Organization.count({
      where: {
        confirmationDate: afterWeekStart,
      },
    }),
    sellersTotal: User.count({
      where: {
        sellerConfirmationDate: { [Op.ne]: null },
      },
    }),
    sellersWeek: User.count({
      where: {
        sellerConfirmationDate: afterWeekStart,
      },
    }),
    customerOrganizationsTotal: JuristicSubject.count(),
    customerOrganizationsWeek: JuristicSubject.count({
      where: {
        createdAt: afterWeekStart,
      },
    }),
    customersTotal: UserRoles.count({
      where: {
        roleId: customerRole.id,
      },
    }),
    customersWeek: UserRoles.count({
      where: {
        roleId: customerRole.id,
        createdAt: afterWeekStart,
      },
    }),
    requestsTotal: OrderRequest.count({
      where: where.requests,
    }),
    requestsWeek: OrderRequest.count({
      where: {
        ...where.requests,
        createdAt: afterWeekStart,
      },
    }),
    rejectedRequestsTotal: OrderRequest.count({
      where: where.rejectedRequests,
    }),
    rejectedRequestsWeek: OrderRequest.count({
      where: {
        ...where.rejectedRequests,
        createdAt: afterWeekStart,
      },
    }),
    ordersTotal: OrderRequest.count({
      where: where.orders,
    }),
    ordersWeek: OrderRequest.count({
      where: {
        [Op.and]: [
          ...where.orders[Op.and],
          {
            [Op.or]: [{ paymentDate: afterWeekStart }, { createdAt: afterWeekStart }],
          },
        ],
      },
    }),
    rejectedOrdersTotal: OrderRequest.count({
      where: where.rejectedOrders,
    }),
    rejectedOrdersWeek: OrderRequest.count({
      where: {
        ...where.rejectedOrders,
        [Op.or]: [{ paymentDate: afterWeekStart }, { createdAt: afterWeekStart }],
      },
    }),
    requestsIndividualsTotal: OrderRequest.count({
      where: {
        ...where.requests,
        payerId: null,
      },
    }),
    requestsIndividualsWeek: OrderRequest.count({
      where: {
        ...where.requests,
        payerId: null,
        createdAt: afterWeekStart,
      },
    }),
    ordersIndividualsTotal: OrderRequest.count({
      where: {
        ...where.orders,
        payerId: null,
      },
    }),
    ordersIndividualsWeek: OrderRequest.count({
      where: {
        ...where.orders,
        payerId: null,
        createdAt: afterWeekStart,
      },
    }),
  };

  const metricsArr = await Promise.all(Object.values(promises));
  const metrics: Partial<{ [key in IMetricLabel]: number }> = {};

  Object.keys(promises).map((key: IMetricLabel, i) => {
    metrics[key] = metricsArr[i];
  });

  const calculatePercent = (part: number, total: number) => (total > 0 ? gaussRound((part / total) * 100, 2) : 0);

  const result: { [key: string]: { total: number; week: number } } = {
    suppliers: {
      total: metrics.suppliersTotal,
      week: metrics.suppliersWeek,
    },
    sellers: {
      total: metrics.sellersTotal,
      week: metrics.sellersWeek,
    },
    customerOrganizations: {
      total: metrics.customerOrganizationsTotal,
      week: metrics.customerOrganizationsWeek,
    },
    customers: {
      total: metrics.customersTotal,
      week: metrics.customersWeek,
    },
    requests: {
      total: metrics.requestsTotal,
      week: metrics.requestsWeek,
    },
    rejectedRequestsPercent: {
      total: calculatePercent(metrics.rejectedRequestsTotal, metrics.requestsTotal),
      week: calculatePercent(metrics.rejectedRequestsWeek, metrics.requestsWeek),
    },
    orders: {
      total: metrics.ordersTotal,
      week: metrics.ordersWeek,
    },
    rejectedOrdersPercent: {
      total: calculatePercent(metrics.rejectedOrdersTotal, metrics.ordersTotal),
      week: calculatePercent(metrics.rejectedOrdersWeek, metrics.ordersWeek),
    },
    requestsIndividuals: {
      total: metrics.requestsIndividualsTotal,
      week: metrics.requestsIndividualsWeek,
    },
    ordersIndividuals: {
      total: metrics.ordersIndividualsTotal,
      week: metrics.ordersIndividualsWeek,
    },
  };

  return result;
};
