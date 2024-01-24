import { Router } from 'express';
import SocketIO from 'socket.io';

import { requireAuth } from '../../../middlewares/auth.mw';
import OrganizationCtrl from '../controllers/organization.ctrl';

const organizationRouter = (io: SocketIO.Server) => {
  const router = Router();
  const orgCtrl = new OrganizationCtrl(io);

  router
    .route('/')
    .get(requireAuth, orgCtrl.getOrganization)
    .post(requireAuth, orgCtrl.createOrganization)
    .put(requireAuth, orgCtrl.updateOrganization)
    .delete(requireAuth, orgCtrl.deleteOrganization);

  router.route('/list').get(requireAuth, orgCtrl.getOrganizationList);

  router.route('/confirm').post(requireAuth, orgCtrl.confirmOrganization);

  router.route('/reject').post(requireAuth, orgCtrl.rejectOrganization);

  router.route('/application').put(requireAuth, orgCtrl.updateOrganizationApplication);

  router
    .route('/seller')
    .get(requireAuth, orgCtrl.getOrganizationSeller)
    .post(requireAuth, orgCtrl.createOrganizationSeller);

  router.route('/seller-organizations-branches').get(requireAuth, orgCtrl.getSellerOrganizationsBranches);

  router.route('/seller/confirm').post(requireAuth, orgCtrl.confirmOrganizationSeller);

  router.route('/seller/reject').post(requireAuth, orgCtrl.rejectOrganizationSeller);

  router.route('/seller/application').put(requireAuth, orgCtrl.updateOrganizationSellerApplication);

  router.route('/by-inn').get(requireAuth, orgCtrl.searchOrganizationByInn);

  router.route('/ban').post(requireAuth, orgCtrl.banOrganization);

  router.route('/get-seller-organizations').get(requireAuth, orgCtrl.getSellerOrganizationList);

  router
    .route('/seller/detach')
    .get(requireAuth, orgCtrl.checkOrganizationSellerActiveOrders)
    .delete(requireAuth, orgCtrl.detachOrganizationSeller);

  router
    .route('/organization-update-application')
    .get(requireAuth, orgCtrl.getOrganizationUpdateApplication)
    .post(requireAuth, orgCtrl.createOrganizationUpdateApplication);
  router
    .route('/organization-update-application/:id/confirm')
    .post(requireAuth, orgCtrl.confirmOrganizationUpdateApplication);
  router
    .route('/organization-update-application/:id/reject')
    .post(requireAuth, orgCtrl.rejectOrganizationUpdateApplication);

  return router;
};

export default organizationRouter;
