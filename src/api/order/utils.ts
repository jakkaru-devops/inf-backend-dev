import User from '../user/models/User.model';
import OrderRequest from './models/OrderRequest.model';
import { ENotificationType } from '../notification/interfaces';
import { IRequestProduct } from './interfaces';
import Organization from '../organization/models/Organization.model';
import { gaussRound } from '../../utils/common.utils';

export type IExtendedStatuses =
  // customer: order request
  | 'REQUESTED'
  | 'OFFER_RECEIVED' // worker: order request
  | `OFFER_UPDATED`
  // seller: order request
  | 'ORDER_REQUEST' // + worker: order request
  | 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION' // + worker: order request
  | 'OFFER_SENT'
  | 'OFFER_EXPIRED'
  | 'OFFER_UPDATE_REQUESTED'
  | 'SHIPPED'
  | 'REFUND_REQUEST'
  | 'REFUND'
  | 'EXCHANGE'
  | 'REJECTED'
  // customer | seller | worker: order
  | 'APPROVED'
  | 'PAID'
  | 'PAYMENT_POSTPONED'
  | 'COMPLETED'
  // seller | worker: order
  | 'REWARD_PAID'
  | 'DECLINED';

/**
 * @description
 * Seller statuses
 * ORDER_REQUEST - done
 * ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION - done
 * OFFER_SENT - done
 * OFFER_EXPIRED - done
 * OFFER_UPDATE_REQUESTED - done
 * PAID - done
 * SHIPPED - done
 * COMPLETED - done
 * REWARD_PAID - done
 * REFUND_REQUEST - done
 * REFUND - done
 * EXCHANGE - done
 */
export const formatOrderRequestStatus = (
  orderRequest: OrderRequest,
  roleLabel: 'customer' | 'seller' | 'employee',
  sellerId?: User['id'],
) => {
  if (!!orderRequest?.get) {
    orderRequest = orderRequest.toJSON() as OrderRequest;
  }

  let status: IExtendedStatuses = orderRequest.status;

  switch (roleLabel) {
    case 'customer':
      if (status === 'PAYMENT_POSTPONED') {
        status = 'PAYMENT_POSTPONED';
        break;
      }

      if (orderRequest.status === 'PAID' && orderRequest?.orders?.some(offer => !!offer?.departureDate)) {
        status = 'SHIPPED';
        break;
      }

      if (status !== 'REQUESTED') break;

      if (orderRequest?.orders?.filter(({ isRequestedToUpdateOffer }) => !!isRequestedToUpdateOffer).length > 0) {
        status = `OFFER_UPDATE_REQUESTED`;
        break;
      }

      if (orderRequest?.orders?.filter(({ isExpiredOffer }) => isExpiredOffer).length > 0) {
        status = `OFFER_EXPIRED`;
        break;
      }

      if (orderRequest?.notifications?.filter(({ type }) => type === ENotificationType.offerUpdated).length > 0) {
        status = `OFFER_UPDATED`;
        break;
      }

      if (orderRequest.orders.length < 1) {
        status = 'REQUESTED';
        break;
      }

      status = 'OFFER_RECEIVED';
      break;

    case 'seller':
      const sellerOffer = orderRequest.orders.find(({ sellerId: offerSellerId }) => offerSellerId === sellerId);

      if (status === 'PAYMENT_POSTPONED') {
        if (sellerOffer?.status === 'PAYMENT_POSTPONED') {
          status = 'PAYMENT_POSTPONED';
          break;
        }
        if (sellerOffer?.status === 'PAID') {
          status = 'PAID';
          break;
        }
      }

      if (status === 'PAID') {
        if (!sellerOffer?.status || sellerOffer?.status === 'OFFER') {
          status = 'APPROVED';
          break;
        }
      }

      if (status === 'APPROVED') {
        if (!sellerOffer || !sellerOffer?.products?.filter(product => product.isSelected)?.length) {
          status = 'ORDER_REQUEST';
          break;
        }
      }

      if (status === 'REQUESTED') {
        if (!sellerOffer) {
          if (orderRequest?.products?.some(({ describedProductId }) => !!describedProductId)) {
            status = 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION';
            break;
          }

          status = 'ORDER_REQUEST';
          break;
        } else {
          if (sellerOffer?.isRequestedToUpdateOffer) {
            status = `OFFER_UPDATE_REQUESTED`;
            break;
          }

          if (sellerOffer?.isExpiredOffer) {
            status = 'OFFER_EXPIRED';
            break;
          }

          status = 'OFFER_SENT';
          break;
        }
      }

      /* const refundExchangeRequest = (sellerOffer?.refundExchangeRequests || [])?.find(el => el.status !== 'CLOSED');
      if (refundExchangeRequest) {
        if (refundExchangeRequest.status === 'PENDING') {
          status = 'REFUND_REQUEST';
          break;
        }
        if (refundExchangeRequest.status === 'AGREED') {
          if (!!refundExchangeRequest.isRejected) {
            status = 'REJECTED';
            break;
          }
          if (refundExchangeRequest.disputeResolution === 'EXCHANGE') {
            status = 'EXCHANGE';
            break;
          } else if (refundExchangeRequest.disputeResolution === 'REFUND') {
            status = 'REFUND';
            break;
          }
        }
      } */

      if (sellerOffer?.reward?.givenAt) {
        status = 'REWARD_PAID';
        break;
      }

      if (sellerOffer?.receivingDate) {
        status = 'COMPLETED';
        break;
      }

      if (sellerOffer?.departureDate) {
        status = 'SHIPPED';
      }

      break;

    case 'employee':
      if (status === 'PAYMENT_POSTPONED') {
        status = 'PAYMENT_POSTPONED';
        break;
      }

      if (!!orderRequest.orders.length && orderRequest.orders.every(offer => offer.reward?.givenAt)) {
        status = 'REWARD_PAID';
        break;
      }

      if (orderRequest.status === 'PAID' && orderRequest?.orders?.some(offer => !!offer?.departureDate)) {
        status = 'SHIPPED';
        break;
      }

      if (status !== 'REQUESTED') break;

      if (orderRequest?.orders?.filter(({ isRequestedToUpdateOffer }) => !!isRequestedToUpdateOffer).length > 0) {
        status = `OFFER_UPDATE_REQUESTED`;
        break;
      }

      if (orderRequest?.orders?.filter(({ isExpiredOffer }) => isExpiredOffer).length > 0) {
        status = `OFFER_EXPIRED`;
        break;
      }

      if (orderRequest?.notifications?.filter(({ type }) => type === ENotificationType.offerUpdated).length > 0) {
        status = `OFFER_UPDATED`;
        break;
      }

      if (orderRequest.orders.length < 1) {
        if (orderRequest.products.some(({ describedProductId }) => !!describedProductId)) {
          status = 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION';
          break;
        }

        status = 'ORDER_REQUEST';
        break;
      }

      status = 'OFFER_RECEIVED';
      break;
    default:
      break;
  }

  return { ...orderRequest, status } as OrderRequest;
};

/**
 * @description   Function to calculate seller's CASH from Order
 */
export const calculateOrderCash = (orderCost: number, comissionPercent: number, sellerIndividual: boolean) => {
  if (sellerIndividual) {
    const comission = comissionPercent / 100;
    const individualPercent = 20 / 100;
    const cash = gaussRound(orderCost * comission * individualPercent, 2);
    return cash;
  }

  const acquiring = 0.014; // Эквайринг = 1.4%
  const comission = comissionPercent / 100; // Комиссия организации агента (продавца)
  const startSum = (orderCost * comission - orderCost * acquiring) * 0.5; // Сумма вознаграждения с затратами на ФОТ

  const bankIndividualComission = 0.1; // комиссия банка за перевод физ лицу = 10%
  const ndfl = 0.13; // НДФЛ = 13%
  const ndflOnHand = 0.1494; // НДФЛ % накрутки на сумму на руки = 14,94252873563%
  const pfr = 0.22; // ПФР = 22%
  const foms = 0.051; // ФОМС = 5.10%
  const coef = 1 + bankIndividualComission + ndflOnHand + pfr + foms + ndflOnHand * pfr + ndflOnHand * foms; // Расчетный коэффициент для суммы на  руки

  const cashWithNdfl = startSum / coef + (startSum / coef) * ndflOnHand; // Доход Агента с НДФЛ
  const ndflWithKopek = cashWithNdfl * ndfl; // НДФЛ с копейками
  const ndflFloor = Math.floor(ndflWithKopek); // НДФЛ округление вниз
  const ndflBudget = ndflWithKopek - ndflFloor < 0.5 ? ndflFloor : Math.ceil(ndflWithKopek); // НДФЛ в бюджет

  const resultCash = cashWithNdfl - ndflBudget; // СУММА вознаграждения Агенту на карту

  return gaussRound(resultCash, 2);
};

export const addNdflToNumber = (num: number) => {
  const sumWidthNdfl = gaussRound(num / 0.87, 2);
  const ndfl = sumWidthNdfl - num;
  const rounderNdfl = Math.round(ndfl);
  return gaussRound(num + rounderNdfl, 2);
};

export const validateOrderData = ({
  organizationId,
  products,
}: {
  organizationId: Organization['id'];
  products: IRequestProduct[];
}): Promise<void> =>
  new Promise((resolve, reject) => {
    if (!organizationId) {
      reject('Необходимо выбрать организацию');
    }

    const validProducts = products.filter(
      ({ productId, quantity, deliveryQuantity, deliveryTerm, unitPrice, newProduct }) =>
        (productId || (!!newProduct?.article?.trim() && !!newProduct?.name.trim())) &&
        (((quantity || !quantity) && deliveryQuantity && deliveryTerm) ||
          (!deliveryQuantity && !deliveryTerm && quantity)) &&
        unitPrice,
    );

    if (!products?.length) {
      reject('Необходимо добавить товары в предложение');
      return;
    }
    if (validProducts.length < products.length) {
      reject('Не все товары в предложении заполнены корректно');
      return;
    }

    resolve();
  });
