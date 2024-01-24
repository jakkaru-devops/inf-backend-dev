import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth.mw';
import { StatisticsController } from '../controllers/statistics.controller';

export const statisticsRouter = () => {
  const statisticsController = new StatisticsController();
  const router = Router();

  router.route('/metrics').get(requireAuth, statisticsController.getMetrics);

  router.route('/top-customers').get(requireAuth, statisticsController.getTopCustomers);

  router.route('/top-customers/:organizationId').get(requireAuth, statisticsController.getCustomerMetrics);

  return router;
};
