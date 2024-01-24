import { Router } from 'express';

import _AppCtrl from './ctrl';

const router = Router();
const _appCtrl = new _AppCtrl();

/**
 * @desc    Init database
 */
router.route('/').post(_appCtrl.runAppInit);

router.route('/catalog').post(_appCtrl.runCatalogInit);
router.route('/catalog/transform-products').post(_appCtrl.transformAllProducts);
router.route('/catalog/transform-applicabilities').post(_appCtrl.transformApplicabilities);
router.route('/catalog/transform-auto-brands').post(_appCtrl.transformAutoBrands);
router.route('/catalog/photo-products').post(_appCtrl.transferPhotoProducts);
router.route('/catalog/update-products-with-parsed-data').post(_appCtrl.updateProductsWithParsedData);
router.route('/catalog/update-products-analogs').post(_appCtrl.updateProductsAnalogs);
router.route('/catalog/fix-auto-brand-group-relations').post(_appCtrl.fixAutoBrandGroupRelations);
router.route('/catalog/transform-products-branches').post(_appCtrl.transformProductsBranches);
router.route('/catalog/fix-products-branches').post(_appCtrl.fixProductsBranches);
router
  .route('/catalog/transform-product-analogs-and-applicabilities')
  .post(_appCtrl.transformProductAnalogsAndApplicabilities);
router.route('/catalog/transform-all-product-groups').post(_appCtrl.transformAllProductGroups);
router.route('/catalog/add-missing-product-main-branches').post(_appCtrl.addMissingProductMainBranches);

router.route('/catalog/product-groups').post(_appCtrl.addProductGroups);
router.route('/catalog/product-group-relations').post(_appCtrl.addProductGroupRelations);

router.route('/catalog/check-missing-marks').post(_appCtrl.checkMissingMarks);

router.route('/catalog/photo-products-json').post(_appCtrl.generatePhotoProductsJson);

router.route('/transport-companies').post(_appCtrl.createInitialTransportCompanies);

router.route('/org-info').post(_appCtrl.updateInfoPdgOrganization);
router.route('/jur-info').post(_appCtrl.updateInfoPdgJuristicSubject);

router.route('/users-dummy-notifications').post(_appCtrl.createUsersDummyNotifications);

router.route('/orders').post(_appCtrl.transformOrders);
router.route('/rewards').post(_appCtrl.updateAllRewards);
router.route('/missing-rewards').post(_appCtrl.createMissingRewards);

router.route('/add-operator-role').post(_appCtrl.createOperatorRole);

router.route('/update-sellers-categories').post(_appCtrl.updateSellersCategories);

router.route('/fix-juristic-subjects').post(_appCtrl.fixJuristicSubjects);

router.route('/orders-supplier-address').post(_appCtrl.addOffersSupplierAddress);

router.route('/fill-products-tags-json').post(_appCtrl.fillProductsTagsJson);

router.route('/fill-request-products-reserve-data').post(_appCtrl.fillRequestProductsReserveData);

router.route('/fill-products-min-price').post(_appCtrl.fillProductsMinPrice);

router.route('/group-products-by-article').post(_appCtrl.groupProductsByArticle);

router.route('/fix-products-prices').post(_appCtrl.fixProductsPrices);

router.route('/sort-groups').post(_appCtrl.sortGroups);
router.route('/hide-groups').post(_appCtrl.hideGroups);

export default router;
