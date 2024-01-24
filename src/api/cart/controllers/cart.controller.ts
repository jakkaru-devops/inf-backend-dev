import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import { ICartProductBasic } from '../../catalog/interfaces';
import cartService from './../services';
import { BaseController } from '../../../core/classes/base.controller';
import { SocketServer } from '../../../core/socket';

export class CartController extends BaseController {
  io: SocketServer;

  createCartProduct = createAPIMethod(
    { errorMessage: 'Ошибка. Товар не добавлен в корзину', runTransaction: false },
    async ({ req, authUser }) => {
      const { productId, quantity, acatProductId, priceOfferId, isSelected, deliveryMethod } = req.body;
      const cartProduct = await cartService.createCartProduct({
        productId,
        quantity,
        acatProductId,
        priceOfferId,
        isSelected,
        deliveryMethod,
        userId: authUser.id,
      });
      return cartProduct;
    },
  );

  updateCartProduct = createAPIMethod(
    { errorMessage: 'Ошибка. Товар не обновлен', runTransaction: false },
    async ({ req, authUser }) => {
      const { productId } = req.params;
      const { quantity, priceOfferId, isSelected, deliveryMethod } = req.body;
      const cartProduct = await cartService.updateCartProduct({
        productId,
        quantity,
        priceOfferId,
        isSelected,
        deliveryMethod,
        userId: authUser.id,
      });
      return cartProduct;
    },
  );

  deleteCartProduct = createAPIMethod(
    { errorMessage: 'Ошибка. Товар не удален из корзины', runTransaction: false },
    async ({ req, authUser }) => {
      const { productId } = req.params;
      const { priceOfferId } = req.body;
      const cartProduct = await cartService.deleteCartProduct({
        productId,
        priceOfferId,
        userId: authUser.id,
      });
      return cartProduct;
    },
  );

  getCartProductBySellers = createAPIMethod(
    { errorMessage: 'Не удалось загрузить товары от продавцов', runTransaction: false },
    async ({ req }) => {
      let cartProductsBasic: ICartProductBasic[] = req.body.cartProducts;

      cartProductsBasic = cartProductsBasic.filter(item => !!item.productId && !!item.quantity && !!item.priceOfferId);

      const resData = await cartService.getCartProductBySellers({ cartProductsBasic });

      return resData;
    },
  );

  updateCartOffer = createAPIMethod(
    {
      errorMessage: 'Не удалось обновить предложение',
      runTransaction: true,
    },
    async ({ req, authUser, transaction }) => {
      const { warehouseId } = req.params;
      const { deliveryMethod } = req.body;

      const resData = await cartService.updateCartOffer(
        { warehouseId, userId: authUser.id, deliveryMethod },
        { transaction },
      );

      return resData;
    },
  );
}
