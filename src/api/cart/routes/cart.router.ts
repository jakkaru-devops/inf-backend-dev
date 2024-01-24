import { Router } from 'express';
import { SocketServer } from '../../../core/socket';
import { CartController } from '../controllers/cart.controller';
import { requirePermissions } from '../../../middlewares/auth.mw';

export const cartRouter = (io: SocketServer) => {
  const cartController = new CartController(io);
  const router = Router();

  router.route('/products').post(requirePermissions('cartAvailable'), cartController.createCartProduct);

  router
    .route('/products/:productId')
    .put(requirePermissions('cartAvailable'), cartController.updateCartProduct)
    .delete(requirePermissions('cartAvailable'), cartController.deleteCartProduct);

  router.route('/products-by-sellers').post(cartController.getCartProductBySellers);

  router.route('/offers/:warehouseId').put(requirePermissions('cartAvailable'), cartController.updateCartOffer);

  return router;
};
