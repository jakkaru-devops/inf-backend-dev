import { Router } from 'express';
import SocketIO from 'socket.io';
import { requireAuth, requirePermissions } from '../../../middlewares/auth.mw';
import UsersCtrl from '../controllers/user.ctrl';
import { FavoriteProductsController } from '../controllers/favoriteProducts.ctrl';

export const profileV2Router = (io: SocketIO.Server) => {
  const router = Router();
  const usersController = new UsersCtrl(io);
  const favoriteProductsController = new FavoriteProductsController();

  router
    .route('/seller-product-categories')
    .get(requireAuth, usersController.getSellerProductCategories)
    .put(requireAuth, usersController.updateSellerProductCategories);

  router
    .route('/favorite-products')
    .get(requirePermissions('favouriteProductsAvailable'), favoriteProductsController.getFavoriteProductList)
    .post(requirePermissions('favouriteProductsAvailable'), favoriteProductsController.createFavoriteProduct);

  router
    .route('/favorite-products/:productId')
    .delete(requirePermissions('favouriteProductsAvailable'), favoriteProductsController.deleteFavoriteProduct);

  router.route('/personal-area').get(requireAuth, usersController.getPersonalAreaData);

  return router;
};
