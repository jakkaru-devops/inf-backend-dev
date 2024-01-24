import { Router } from 'express';
import SocketIO from 'socket.io';

import { requirePermissions, requireAuth } from '../../../middlewares/auth.mw';
import { getUserLanguage } from '../../../middlewares/language.mw';
import UsersCtrl from '../controllers/user.ctrl';
import RoleCtrl from '../../role/ctrl';
import ShippingCtrl from '../../shipping/ctrl';
import ComplaintCtrl from '../controllers/complaint.ctrl';
import UserCartProductsCtrl from '../controllers/userCartProducts.ctrl';
import SpecialClientsCtrl from '../controllers/specialClients.ctrl';

const userRouter = (io: SocketIO.Server) => {
  const router = Router();
  const usersCtrl = new UsersCtrl(io);
  const rolesCtrl = new RoleCtrl(io);
  const shippingCtrl = new ShippingCtrl();
  const complaintCtrl = new ComplaintCtrl(io);
  const userCartProductsCtrl = new UserCartProductsCtrl();
  const specialClientsCtrl = new SpecialClientsCtrl();

  router.route('/').get(usersCtrl.getUser).put(requireAuth, usersCtrl.updateUser);

  router.route('/info').get(requirePermissions('inspectUsersInfoAvailable'), usersCtrl.getUserInfo);

  router
    .route('/profile/mobile-token')
    .post(requireAuth, usersCtrl.saveDeviceToken)
    .delete(requireAuth, usersCtrl.deleteDeviceToken);

  router
    .route('/:userId/role')
    .post(requirePermissions('manageRolesAvailable'), rolesCtrl.addRoleToUsers)
    .delete(requirePermissions('manageRolesAvailable'), rolesCtrl.removeUserRole);

  router.route('/punish').post(requirePermissions('banAvailable'), rolesCtrl.punishUserRole);

  router
    .route('/review')
    .get(requireAuth, usersCtrl.getUserReviews)
    .post(requirePermissions('writeReviewAvailable'), usersCtrl.addUserReview);

  router.route('/complaint/all').get(requirePermissions('readComplainAvailable'), complaintCtrl.getAllComplaints);
  router.route('/complaint/list').get(requirePermissions('readComplainAvailable'), complaintCtrl.getComplaintList);
  router.route('/complaint').post(requirePermissions('writeComplainAvailable'), complaintCtrl.createComplaint);

  router.route('/list').get(requireAuth, usersCtrl.getUserList);
  router.route('/sellers-for-order').get(requireAuth, usersCtrl.getSellerListForOrder);

  router
    .route('/profile')
    .get([getUserLanguage, requireAuth], usersCtrl.getAuthUserProfile)
    .delete(requireAuth, usersCtrl.deleteProfile);

  router.route('/profile/username').patch(requireAuth, usersCtrl.updateAuthUserName);
  router.route('/profile/phone').patch(requireAuth, usersCtrl.updateAuthUserPhone);
  router.route('/profile/phone-visible').patch(requireAuth, usersCtrl.toggleAuthUserPhoneVisible);
  router.route('/profile/trigger-notification').patch(requireAuth, usersCtrl.toggleEmailNotification);
  router.route('/profile/email-notification').patch(requireAuth, usersCtrl.updateEmailForNotification);
  router.route('/profile/default-addresses').patch(requireAuth, usersCtrl.updateDefaultAddress);

  // router
  //   .route('/favorite-products')
  //   .get(
  //     [getUserLanguage, requirePermissions('favouriteProductsAvailable')],
  //     userFavoriteProductsCtrl.getFavoriteProductList,
  //   )
  //   .post(requirePermissions('favouriteProductsAvailable'), userFavoriteProductsCtrl.addFavoriteProduct);

  // router
  //   .route('/favorite-products/:productId')
  //   .delete(requirePermissions('favouriteProductsAvailable'), userFavoriteProductsCtrl.dropFavoriteProduct);

  router
    .route('/cart-product')
    .post(requirePermissions('cartAvailable'), userCartProductsCtrl.addCartProduct)
    .put(requirePermissions('cartAvailable'), userCartProductsCtrl.updateCartProduct)
    .delete(requirePermissions('cartAvailable'), userCartProductsCtrl.dropCartProduct);

  router.route('/customer').get(requireAuth, usersCtrl.getCustomerUser);

  router
    .route('/juristic-subject')
    .get(requireAuth, usersCtrl.getCustomerJuristicSubject)
    .post(requireAuth, usersCtrl.createJuristicSubject)
    .put(requireAuth, usersCtrl.updateCustomerJuristicSubject)
    .delete(requireAuth, usersCtrl.deleteCustomerJuristicSubject);

  router.route('/juristic-subject/list').get(requireAuth, usersCtrl.getCustomerJuristicSubjectList);

  // Special clients
  router.route('/juristic-subject/special-status').patch(requireAuth, usersCtrl.updateJuristicSubjectSpecialStatus);
  router
    .route('/profile/customer-contracts')
    .get(requireAuth, usersCtrl.getCustomerContractList)
    .post(requireAuth, specialClientsCtrl.createCustomerContract);
  router
    .route('/profile/customer-contracts/:contractId')
    .put(requireAuth, specialClientsCtrl.updateCustomerContract)
    .delete(requireAuth, specialClientsCtrl.deleteCustomerContract);
  router
    .route('/special-clients')
    .get(requireAuth, specialClientsCtrl.getAllSpecialClientsList)
    .post(requireAuth, specialClientsCtrl.createCustomerContract);
  router
    .route('/special-clients/customer-contracts/:contractId')
    .put(requireAuth, specialClientsCtrl.updateCustomerContract)
    .delete(requireAuth, specialClientsCtrl.deleteCustomerContract);

  // Postponed payments
  router
    .route('/juristic-subject/postponed-payment-allowed')
    .patch(requireAuth, usersCtrl.updateJuristicSubjectPostponedPaymentAllowed);

  router
    .route('/worker')
    .post(requirePermissions('manageEmployeesAvailable'), usersCtrl.createWorker)
    .put(requirePermissions('manageEmployeesAvailable'), usersCtrl.updateWorker);

  router
    .route('/transport-company/list')
    .get(requirePermissions('transportСompanyAvailable'), shippingCtrl.getTransportCompanyList);

  router
    .route('/transport-company')
    .put(requirePermissions('transportСompanyAvailable'), shippingCtrl.updateSellersTransportCompanies);

  router.route('/seller-register').post(requireAuth, usersCtrl.handleSellerRegister);

  router
    .route('/seller-update-application/:userId')
    .get(requireAuth, usersCtrl.getSellerUpdateApplication)
    .post(requireAuth, usersCtrl.createSellerUpdateApplication);
  router
    .route('/seller-update-application/:userId/confirm')
    .post(requireAuth, usersCtrl.confirmSellerUpdateApplication);
  router.route('/seller-update-application/:userId/reject').post(requireAuth, usersCtrl.rejectSellerUpdateApplication);

  router.route('/seller-product-categories').put(requireAuth, usersCtrl.updateSellerProductCategories);

  router.route('/seller-offer-doc').patch(requireAuth, usersCtrl.updateSellerOfferDoc);

  return router;
};

export default userRouter;
