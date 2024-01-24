import { Op } from 'sequelize';
import OrderRequest from '../../order/models/OrderRequest.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import _ from 'lodash';
import statisticsService from '../statistics.service';

export const getTopCustomersService = async () => {
  // Получаю все запросы и все заказы где задана организация-плательщик (payerId - JuristicSubject.id)
  const allRequests = (
    await OrderRequest.findAll({
      where: {
        payerId: { [Op.ne]: null },
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
    })
  ).map(el => ({ ...el?.toJSON(), isRequest: true } as OrderRequest));
  const allOrders = (
    await OrderRequest.findAll({
      where: {
        payerId: { [Op.ne]: null },
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
    })
  ).map(el => ({ ...el?.toJSON(), isOrder: true } as OrderRequest));

  // Собираю запросы и заказы в объект с ключами - id организаций
  const ordersByPayersObj = _.groupBy([...allRequests, ...allOrders], 'payerId');

  // Группирую запросы и заказы по организациям
  const ordersByPayers = Object.keys(ordersByPayersObj).map(payerId => {
    const requests = ordersByPayersObj[payerId].filter(el => el?.isRequest);
    const orders = ordersByPayersObj[payerId].filter(el => el?.isOrder);
    const ordersTotalPrice = orders.map(order => order.totalPrice).reduce((a, b) => a + b, 0);

    return {
      payerId,
      requests,
      orders,
      ordersTotalPrice,
    };
  });

  // Сортирую группы запросов и заказов по сумме заказов у организаций
  const orderedGroups = _.orderBy(ordersByPayers, 'ordersTotalPrice', 'desc');

  const customerOrganizations: JuristicSubject[] = [];

  for (let i = 0; i < 10; i++) {
    const group = orderedGroups?.[i];
    if (!group) continue;

    // Собираю общие метрики организаций (общие и по неделям)
    const { organization, requestsNumber, ordersNumber, weeks } = await statisticsService.getCustomerMetrics({
      organizationId: group.payerId,
      requests: group.requests,
      orders: group.orders,
    });

    customerOrganizations.push({
      ...organization,
      requestsNumber,
      ordersNumber,
      totalOrdersSum: group.ordersTotalPrice,
      weeks,
    } as JuristicSubject);
  }

  return customerOrganizations;
};
