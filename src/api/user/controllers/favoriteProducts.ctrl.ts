import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import usersService from '../services';

export class FavoriteProductsController {
  /**
   * @desc      Get all auth user's favorite products
   * @route     GET /user/favorite-products
   * @success 	{ count: number; rows: FavoriteProduct[] }
   * @access    permission: favouriteProductsAvailable
   */
  getFavoriteProductList = createAPIMethod(
    { errorMessage: 'Ошибка. Избранные товары не загружены', runTransaction: false },
    async ({ authUser }) => {
      return await usersService.getFavoriteProductList({
        userId: authUser.id,
      });
    },
  );

  /**
   * @desc      Creates new FavoriteProduct entity for auth user
   * @route     POST /user/favorite-products
   * @body 			{ productId: string }
   * @success 	{ result: FavoriteProduct, message: string }
   * @access    permission: favouriteProductsAvailable
   */
  createFavoriteProduct = createAPIMethod(
    { errorMessage: 'Ошибка. Товар не добавлен в избранные', runTransaction: false },
    async ({ req, authUser }) => {
      const { productId, priceOfferId } = req.body;
      const favoriteProduct = await usersService.createFavoriteProduct({
        productId,
        priceOfferId,
        userId: authUser.id,
      });
      return favoriteProduct;
    },
  );

  /**
   * @desc      Deletes FavoriteProduct entity for auth user
   * @route     DELETE /user/favorite-products/:productId
   * @params 		{ productId: string }
   * @success 	{ message: string }
   * @access    permission: favouriteProductsAvailable
   */
  deleteFavoriteProduct = createAPIMethod(
    { errorMessage: 'Ошибка. Товар не удален из списка избранных', runTransaction: false },
    async ({ req, authUser }) => {
      const { productId } = req.params;
      const { priceOfferId } = req.body;
      const favoriteProduct = await usersService.deleteFavoriteProduct({
        productId,
        priceOfferId,
        userId: authUser.id,
      });
      return favoriteProduct;
    },
  );
}
