import { Transaction } from 'sequelize';
import { ICartProductBasic } from '../../catalog/interfaces';
import User from '../../user/models/User.model';
import CartProduct from '../models/CartProduct.model';
import { Op } from 'sequelize';
import cartService from '../services';
import _ from 'lodash';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import StockBalance from '../../catalog/models/StockBalance.model';

interface IProps {
  userId: User['id'];
  deliveryAddress: Address;
}

export const getCartOffersDataService = async (
  { userId, deliveryAddress }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const user = await User.findByPk(userId, { transaction });
  const userCartProducts = await CartProduct.findAll({
    where: {
      userId: user.id,
      priceOfferId: { [Op.ne]: null },
      isSelected: true,
      deliveryMethod: { [Op.ne]: null },
      quantity: { [Op.gt]: 0 },
    },
    transaction,
  });
  const cartProductsBasic: ICartProductBasic[] = userCartProducts.map(item => ({
    productId: item.productId,
    quantity: item.quantity,
    priceOfferId: item.priceOfferId,
    isSelected: item.isSelected,
    deliveryMethod: item.deliveryMethod,
    createdAt: String(item.createdAt),
  }));

  const cartOffers = await cartService.getCartProductBySellers({ cartProductsBasic });
  let requestedProductsData: Array<{ productId: string; quantity: number; priceOfferId: StockBalance['id'] }> = [];

  for (const cartOffer of cartOffers) {
    cartOffer.totalPrice = cartOffer.products
      .map(product => product.quantity * product.unitPrice)
      .reduce((a, b) => a + b, 0);

    // Collect total requested products
    for (const cartProduct of cartOffer.products) {
      let productById = requestedProductsData.find(
        item => item.productId === cartProduct.product.id && item.priceOfferId === cartProduct.priceOfferId,
      );
      if (!productById) {
        productById = {
          productId: cartProduct.product.id,
          quantity: cartProduct.quantity,
          priceOfferId: cartProduct.priceOfferId,
        };
        requestedProductsData.push(productById);
      } else {
        productById.quantity += cartProduct.quantity;
      }
    }
  }

  const totalProductIds = _.uniq(userCartProducts.map(item => item.productId));
  const totalOrderPrice = cartOffers.map(offer => offer.totalPrice).reduce((a, b) => a + b, 0);

  delete deliveryAddress.id;
  delete deliveryAddress.idInt;
  delete (deliveryAddress as any).createdAt;
  delete (deliveryAddress as any).updatedAt;

  const address = await Address.create(transformAddress({ ...deliveryAddress }), { transaction });

  return {
    user,
    address,
    cartOffers,
    totalProductIds,
    totalOrderPrice,
    requestedProductsData,
    userCartProducts,
  };
};
