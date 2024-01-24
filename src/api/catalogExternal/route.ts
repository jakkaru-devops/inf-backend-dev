import { Router } from 'express';
import { requireAuth } from '../../middlewares/auth.mw';
import { getUserLanguage } from '../../middlewares/language.mw';
import Acat from './controllers/acat.ctrl';
import { handleExternalCatalogRequest } from './middlewares/handleExternalCatalogRequest.middleware';
import Laximo from './controllers/laximo.ctrl';
import { LAXIMO_CARS_BASE_URL } from '../../config/env';

const router = Router();
const acatCtrl = new Acat();
const laximoCarsCtrl = new Laximo(LAXIMO_CARS_BASE_URL);

router.route('/laximo/*').get(handleExternalCatalogRequest, laximoCarsCtrl.handleEveryLaximoGetRequest);

router.route('/auto-types').get(handleExternalCatalogRequest, acatCtrl.getAutoTypeList);
router.route('/auto-brand').get(handleExternalCatalogRequest, acatCtrl.getAutoBrand);
router.route('/auto-model').get(handleExternalCatalogRequest, acatCtrl.getAutoModel);
router.route('/product-group').get(handleExternalCatalogRequest, acatCtrl.getProductGroup);

router.route('/').get(handleExternalCatalogRequest, acatCtrl.getCatalog);
router.route('/image').get(handleExternalCatalogRequest, acatCtrl.getImage);

router.route('/copy-product').post([getUserLanguage], acatCtrl.copyProduct);
router.route('/cart-product').post([requireAuth, getUserLanguage], acatCtrl.addCartProduct);
router.route('/favorite-product').post([requireAuth, getUserLanguage], acatCtrl.addFavoriteProduct);

router.route('/acat/models').get(handleExternalCatalogRequest, acatCtrl.getAutoModelList);
router.route('/acat/modifications').get(handleExternalCatalogRequest, acatCtrl.getModificationList);
router.route('/acat/groups').get(handleExternalCatalogRequest, acatCtrl.getGroupList);
router.route('/acat/parts').get(handleExternalCatalogRequest, acatCtrl.getPartList);
router.route('/acat/scheme').get(handleExternalCatalogRequest, acatCtrl.getSchemeImage);

/* Laximo routes
router.use('/laximo/cars', laximoCars);
router.use('/laximo/trucks', laximoTrucks); */

// router.route('/save').post(acatCtrl.addProduct);

export default router;
