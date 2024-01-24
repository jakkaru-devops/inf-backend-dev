import { Transaction } from 'sequelize';
import Product from '../models/Product.model';
import StockBalance from '../models/StockBalance.model';
import { PricedProductReservation } from '../models/PricedProductReservation.model';
import { Op } from 'sequelize';
import { entityToJSON } from '../../../utils/common.utils';

interface IProps {
  productId: Product['id'];
}

export const updateProductMinPriceService = async (
  { productId }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  /* const allProductReservations = await PricedProductReservation.findAll({
    where: {
      productId,
      expiresAt: { [Op.gt]: new Date() },
    },
    transaction,
  });
  const priceOffers = (
    await StockBalance.findAll({
      where: {
        productId,
        amount: { [Op.gt]: 0 },
      },
      transaction,
    })
  ).map(el => entityToJSON<StockBalance>(el));

  for (const priceOffer of priceOffers) {
    const totalReservedQuantity = allProductReservations
      .filter(el => el.priceOfferId === priceOffer.id)
      .map(el => el.quantity)
      .reduce((a, b) => a + b, 0);
    priceOffer.amount -= totalReservedQuantity;
  }

  const prices = priceOffers.filter(el => el?.amount > 0).map(el => el.price);
  const minPrice = !!prices?.length ? Math.min(...prices) : null;

  await Product.update(
    {
      minPrice,
    },
    {
      where: {
        id: productId,
      },
      transaction,
    },
  ); */
};
