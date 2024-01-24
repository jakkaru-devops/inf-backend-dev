import { Router } from 'express';
import ProductsCtrl from '../controllers/product.ctrl';
import ProductCategoriesCtrl from '../controllers/category.ctrl';
import { requireAuth } from '../../../middlewares/auth.mw';
import ProductOffersCtrl from '../controllers/productOffer.ctrl';
import { getUserLanguage } from '../../../middlewares/language.mw';
import { SocketServer } from '../../../core/socket';

const catalogRouter = (io: SocketServer) => {
  const productsCtrl = new ProductsCtrl();
  const productOffersCtrl = new ProductOffersCtrl(io);
  const catsCtrl = new ProductCategoriesCtrl();
  const router = Router();

  router.route('/categories-combined').get(getUserLanguage, catsCtrl.getCategoriesCombined);

  router.route('/auto-types').get(getUserLanguage, catsCtrl.getAutoTypeList);

  router
    .route('/auto-brands')
    .get(getUserLanguage, catsCtrl.getAutoBrandList)
    .post([requireAuth, getUserLanguage], catsCtrl.createAutoBrand);
  router
    .route('/auto-brands/:id')
    .get(getUserLanguage, catsCtrl.getAutoBrand)
    .put([requireAuth, getUserLanguage], catsCtrl.updateAutoBrand)
    .delete([requireAuth, getUserLanguage], catsCtrl.deleteAutoBrand);

  router
    .route('/auto-models')
    .get(getUserLanguage, catsCtrl.getAutoModelList)
    .post([requireAuth, getUserLanguage], catsCtrl.createAutoModel);
  router
    .route('/auto-models/:id')
    .put([requireAuth, getUserLanguage], catsCtrl.updateAutoModel)
    .delete([requireAuth, getUserLanguage], catsCtrl.deleteAutoModel);

  router
    .route('/product-groups')
    .get(getUserLanguage, catsCtrl.getProductGroupList)
    .post([requireAuth, getUserLanguage], catsCtrl.createProductGroup);
  router
    .route('/product-groups/:id')
    .get(getUserLanguage, catsCtrl.getProductGroup)
    .put([requireAuth, getUserLanguage], catsCtrl.updateProductGroup)
    .delete([requireAuth, getUserLanguage], catsCtrl.deleteProductGroup);

  router
    .route('/products')
    .get(getUserLanguage, productsCtrl.getProductList)
    .post([requireAuth, getUserLanguage], productsCtrl.createProduct);

  router.route('/products-by-ids').get(getUserLanguage, productsCtrl.getProductListByIds);

  router
    .route('/products/:id')
    .get(getUserLanguage, productsCtrl.getProduct)
    .put([requireAuth, getUserLanguage], productsCtrl.updateProduct)
    .delete(requireAuth, productsCtrl.deleteProduct);

  router.route('/products/:id/branches').get(getUserLanguage, productsCtrl.getProductBranches);
  router.route('/products/:id/applicabilities').get(getUserLanguage, productsCtrl.getProductApplicabilities);
  router.route('/products/:id/analogs').get(getUserLanguage, productsCtrl.getProductAnalogs);
  router.route('/products/:id/recommended-products').get(getUserLanguage, productsCtrl.getRecommendedProducts);

  router.route('/cart-products').post(getUserLanguage, productsCtrl.getCartProductList);

  router
    .route('/product-offers')
    .get([requireAuth, getUserLanguage], productOffersCtrl.getProductOfferList)
    .post([requireAuth, getUserLanguage], productOffersCtrl.createProductOffer);

  router
    .route('/product-offers/:id')
    .get([requireAuth, getUserLanguage], productOffersCtrl.getProductOffer)
    .put([requireAuth, getUserLanguage], productOffersCtrl.updateProductOffer);

  router.route('/product-offers/:id/accept').post([requireAuth, getUserLanguage], productOffersCtrl.acceptProductOffer);

  router.route('/product-offers/:id/reject').post([requireAuth, getUserLanguage], productOffersCtrl.rejectProductOffer);

  /* router
    .route('/analog')
    .get(getUserLanguage, productsCtrl.getProductAnalogs)
    .post(requireAuth, productsCtrl.createProductAnalog)
    .delete(requireAuth, productsCtrl.deleteProductAnalog); */

  return router;
};

export default catalogRouter;
