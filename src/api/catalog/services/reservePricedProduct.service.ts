import { Transaction } from 'sequelize';
import RequestProduct from '../../order/models/RequestProduct.model';
import StockBalance from '../models/StockBalance.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import Product from '../models/Product.model';
import { PricedProductReservation } from '../models/PricedProductReservation.model';
import Order from '../../order/models/Order.model';
import moment from 'moment';
import catalogService from '../catalog.service';

interface IProps {
  offer: Order;
  offerProduct: RequestProduct;
}

export const reservePricedProductService = async (
  { offer, offerProduct }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  if (!offerProduct?.priceOfferId) return;

  const stockBalance = await StockBalance.findByPk(offerProduct.priceOfferId, {
    transaction,
  });
  if (!stockBalance || stockBalance.amount < offerProduct.count) {
    let productName = offerProduct?.reserveName || offerProduct?.altName;
    if (!productName) {
      const product = await Product.findByPk(offerProduct.productId, { transaction });
      if (!product)
        throw new ServiceError({
          status: httpStatus.NOT_FOUND,
          message: `Товар не найден`,
        });

      productName = product?.name_ru;
    }

    throw new ServiceError({
      status: httpStatus.GONE,
      message: `Товара ${productName} нет в наличии в достаточном объеме`,
    });
  }

  let reservation = await PricedProductReservation.findOne({
    where: {
      priceOfferId: stockBalance.id,
      productId: offerProduct.productId,
      orderId: offer.orderRequestId,
      offerId: offer.id,
      requestProductId: offerProduct.requestedProductId,
      offerProductId: offerProduct.id,
    },
    transaction,
  });

  if (!reservation) {
    reservation = new PricedProductReservation({
      priceOfferId: stockBalance.id,
      productId: offerProduct.productId,
      orderId: offer.orderRequestId,
      offerId: offer.id,
      requestProductId: offerProduct.requestedProductId,
      offerProductId: offerProduct.id,
      quantity: offerProduct.count,
    });
  }

  reservation.expiresAt = moment().add({ days: 3 }).toDate();

  await reservation.save({ transaction });

  await catalogService.updateProductMinPrice({ productId: offerProduct.productId }, { transaction });
};
