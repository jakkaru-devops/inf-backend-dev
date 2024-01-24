import { Router } from 'express';
import ShippingCtrl from './ctrl';
import { requireAuth } from '../../middlewares/auth.mw';

const router = Router();

const shippingCtrl = new ShippingCtrl();

router.route('/transport-company/all').get(shippingCtrl.getAllTransportCompanies);

router.route('/transport-company').get(shippingCtrl.getTransportCompany);

router.route('/seller-company/list').get(shippingCtrl.getTransportModelList)

router.route('/seller-company/drop').delete(requireAuth, shippingCtrl.dropSellerTransportCompany)

// router.route('/prices').post(shippingCtrl.calculateShippingPrice);

export default router;