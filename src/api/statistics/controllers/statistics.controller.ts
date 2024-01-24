import httpStatus from 'http-status';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import { APIError } from '../../../utils/api.utils';
import { isManager } from '../../user/utils';
import statisticsService from '../statistics.service';

export class StatisticsController {
  getMetrics = createAPIMethod(
    { errorMessage: 'Не удалось получить метрики', runTransaction: false },
    async ({ res, authUserRole }) => {
      if (!isManager(authUserRole))
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Недостаточно прав',
        });

      const resData = await statisticsService.getMetrics();
      return resData;
    },
  );

  getTopCustomers = createAPIMethod(
    { errorMessage: 'Не удалось получить топ покупателей', runTransaction: false },
    async ({ res, authUserRole }) => {
      if (!isManager(authUserRole))
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Недостаточно прав',
        });

      const resData = await statisticsService.getTopCustomers();
      return resData;
    },
  );

  getCustomerMetrics = createAPIMethod(
    { errorMessage: 'Не удалось получить метрики покупателя', runTransaction: false },
    async ({ req, res, authUserRole }) => {
      if (!isManager(authUserRole))
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Недостаточно прав',
        });

      const { organizationId } = req.params;
      const resData = await statisticsService.getCustomerMetrics({ organizationId });
      return resData;
    },
  );
}
