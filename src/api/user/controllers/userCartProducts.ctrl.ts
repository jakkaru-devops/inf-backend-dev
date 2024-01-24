import { Request, Response } from 'express';
import httpStatus from 'http-status';

import { APIError, APIResponse } from '../../../utils/api.utils';
import CartProduct from '../../cart/models/CartProduct.model';
import User from '../models/User.model';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import { ICartProductBasic } from '../../catalog/interfaces';
import { Op } from 'sequelize';

class UserCartProductsCtrl {
  /**
   * @desc      Creates new CartProduct entity for auth user
   * @route     POST /user/cart-product
   * @body 			{ productId: string }
   * @success 	{ result: CartProduct, message: string }
   * @access    permission: cartAvailable
   */
  addCartProduct = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const { productId, quantity, acatProductId, priceOfferId } = req.body;

      if (!quantity || quantity < 1) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: `Некорректное количество товара - ${quantity}`,
        });
      }

      const whereCartProduct: any = {
        userId: authUser.id,
        productId,
        priceOfferId: !!priceOfferId ? priceOfferId : null,
      };

      let cartProduct = await CartProduct.findOne({
        where: whereCartProduct,
      });
      if (cartProduct) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: `Этот товар уже добавлен в корзину`,
        });
      }

      cartProduct = await CartProduct.create({
        userId: authUser.id,
        productId,
        quantity,
        acatProductId,
        priceOfferId,
      });

      return APIResponse({
        res,
        data: {
          result: cartProduct,
          message: 'Товар добавлен в корзину',
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Товар не добавлен в корзину',
        error: err,
      });
    }
  };

  /**
   * @desc      Updates CartProduct entity for auth user
   * @route     PUT /user/cart-product
   * @body 			{ productId: string }
   * @success 	{ result: CartProduct, message: string }
   * @access    permission: cartAvailable
   */
  updateCartProduct = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const { productIds, quantity, priceOfferId, isSelected, deliveryMethod } = req.body;
      let { productId } = req.body;

      if (!quantity || quantity < 1) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: `Некорректное количество товара - ${quantity}`,
        });
      }

      const whereCartProduct: any = {
        userId: authUser.id,
        priceOfferId: !!priceOfferId ? priceOfferId : null,
      };

      if (productId || productIds?.length === 1) {
        productId = productId || productIds[0];
        whereCartProduct.productId = productId;

        let cartProduct = await CartProduct.findOne({
          where: whereCartProduct,
        });
        if (!cartProduct) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `Товар еще не добавлен в корзину`,
          });
        }

        cartProduct = await cartProduct.update({
          quantity,
          isSelected,
          deliveryMethod,
        });

        return APIResponse({
          res,
          data: {
            result: [cartProduct],
            message: 'Товар обновлен',
          },
        });
      }
      if (productIds) {
        whereCartProduct.productId = productIds;

        let cartProducts = await CartProduct.findAll({
          where: whereCartProduct,
        });
        if (!cartProducts?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `Товары еще не найдены в корзине`,
          });
        }

        for (const cartProduct of cartProducts) {
          await cartProduct.update({
            quantity,
            isSelected,
            deliveryMethod,
          });
        }

        return APIResponse({
          res,
          data: {
            result: cartProducts,
            message: 'Товары обновлены',
          },
        });
      }
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Товар не обновлен',
        error: err,
      });
    }
  };

  /**
   * @desc      Deletes CartProduct entity for auth user
   * @route     DELETE /user/cart-product
   * @body 			{ productId: string }
   * @success 	{ message: string }
   * @access    permission: cartAvailable
   */
  dropCartProduct = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const { productId, priceOfferId } = req.body;

      const whereCartProduct: any = {
        userId: authUser.id,
        productId,
        priceOfferId: !!priceOfferId ? priceOfferId : null,
      };
      let cartProduct = await CartProduct.findOne({
        where: whereCartProduct,
      });
      if (!cartProduct) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: `Товар еще не добавлен в корзину`,
        });
      }

      await cartProduct.destroy({
        force: true,
      });

      return APIResponse({
        res,
        data: {
          message: 'Товар удален из корзины',
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Товар не удален из корзины',
        error: err,
      });
    }
  };
}

export default UserCartProductsCtrl;
