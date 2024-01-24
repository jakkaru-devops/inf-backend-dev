import { getCartProductBySellersService } from './getCartProductsBySellers.service';
import { getCartOffersDataService } from './getCartOffersData.service';
import { createCartProductService } from './createCartProduct.service';
import { updateCartProductService } from './updateCartProduct.service';
import { deleteCartProductService } from './deleteCartProduct.service';
import { updateCartOfferService } from './updateCartOffer.service';

const cartService = {
  getCartProductBySellers: getCartProductBySellersService,
  getCartOffersData: getCartOffersDataService,
  createCartProduct: createCartProductService,
  updateCartProduct: updateCartProductService,
  deleteCartProduct: deleteCartProductService,
  updateCartOffer: updateCartOfferService,
};

export default cartService;
