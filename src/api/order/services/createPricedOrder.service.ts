import { Transaction } from 'sequelize';
import { SocketServer } from '../../../core/socket';
import Organization from '../../organization/models/Organization.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import { getOrgName } from '../../organization/utils';
import User from '../../user/models/User.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import _ from 'lodash';
import RequestProduct from '../../order/models/RequestProduct.model';
import OrderRequestSellerData from '../../order/models/OrderRequestSellerData.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import Order from '../../order/models/Order.model';
import { ENotificationType } from '../../notification/interfaces';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import Address from '../../address/models/Address.model';
import ordersService from '../../order/orders.service';
import catalogService from '../../catalog/catalog.service';
import cartService from '../../cart/services';
import CartProduct from '../../cart/models/CartProduct.model';
import moment from 'moment';
import addDate from 'date-fns/add';
import { PostponedPayment } from '../models/PostponedPayment.model';

interface IProps {
  userId: User['id'];
  deliveryAddress: Address;
}

export const createPricedOrderService = async (
  { userId, deliveryAddress }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const { user, cartOffers, address, totalProductIds, totalOrderPrice, requestedProductsData, userCartProducts } =
    await cartService.getCartOffersData({ userId, deliveryAddress }, { transaction });

  const idOrder = await ordersService.defineNewOrderId({ user }, { transaction });
  const nowDate = new Date();
  const order = await OrderRequest.create(
    {
      idOrder,
      deliveryAddressId: address.id,
      customerId: user.id,
      selectedSellerIds: null,
      comment: null, // TODO
      productIds: JSON.stringify([totalProductIds]),
      customerLastNotificationCreatedAt: nowDate,
      managerLastNotificationCreatedAt: nowDate,
      status: 'APPROVED',
      customerStatus: 'APPROVED',
      managerStatus: 'APPROVED',
      totalPrice: totalOrderPrice,
      paymentType: null,
      payerId: null,
      paidSum: 0,
      paymentDate: null,
      unpaidSellerIds: JSON.stringify(cartOffers.map(cartOffer => cartOffer.seller.id)),
    },
    { transaction },
  );

  const requestedProducts: RequestProduct[] = [];
  for (const requestedProductData of requestedProductsData) {
    requestedProducts.push(
      await RequestProduct.create(
        {
          orderRequestId: order.id,
          productId: requestedProductData.productId,
          quantity: requestedProductData.quantity,
          priceOfferId: requestedProductData.priceOfferId,
        },
        { transaction },
      ),
    );
  }

  const addThirdNumber = cartOffers.length > 1;

  for (let i = 0; i < cartOffers.length; i++) {
    const cartOffer = cartOffers[i];
    const offerTotalPrice = cartOffer.products
      .map(product => product.quantity * product.unitPrice)
      .reduce((a, b) => a + b, 0);

    await OrderRequestSellerData.create(
      {
        orderRequestId: order.id,
        sellerId: cartOffer.seller.id,
        productsNumber: cartOffer.products.map(product => product.quantity).reduce((a, b) => a + b, 0),
        productIds: JSON.stringify([cartOffer.products.map(product => product.product.id)]),
        describedProductsNumber: 0,
        lastNotificationCreatedAt: nowDate,
        sellerStatus: 'APPROVED',
      },
      { transaction },
    );

    const organization = await Organization.findByPk(cartOffer.organization.id, { transaction });
    const orgSeller = await OrganizationSeller.findOne({
      where: {
        organizationId: cartOffer.organization.id,
        userId: cartOffer.seller.id,
      },
      transaction,
    });
    if (!!orgSeller.detachedAt) {
      throw new ServiceError({
        status: httpStatus.FORBIDDEN,
        message: `Продавец откреплен от организации ${getOrgName(organization, true, true)}`,
      });
    }
    const supplierAddress = cartOffer.organization.address;
    const paymentPostponedAt =
      cartOffer?.postponedPayment?.status === 'APPROVED'
        ? moment(addDate(nowDate, { days: cartOffer.postponedPayment.daysApproved })).format('yyyy.MM.DD')
        : null;

    const offer = await Order.create(
      {
        idOrder: `${order.idOrder}${addThirdNumber ? `-${i + 1}` : ''}`,
        orderRequestId: order.id,
        sellerId: cartOffer.seller.id,
        organizationId: cartOffer.organization.id,
        organizationSellerId: orgSeller.id,
        supplierAddressId: supplierAddress.id,
        totalPrice: offerTotalPrice,
        regionFiasId: supplierAddress.regionFiasId,
        status: !paymentPostponedAt ? 'OFFER' : 'PAYMENT_POSTPONED',
        sellerStatus: !paymentPostponedAt ? 'OFFER' : 'PAYMENT_POSTPONED',
        paidSum: 0,
        paidAt: null,
        sellerLastNotificationCreatedAt: nowDate,
        sellerUpdatedAt: nowDate,
        offerExpiresAt: addDate(nowDate, { days: 3 }),
        isPickup: cartOffer.deliveryMethod === 'pickup',
        transportCompanyId: cartOffer.deliveryMethod !== 'pickup' ? cartOffer.deliveryMethod : null,
        paymentPostponedAt,
        paymentPostponeMaxSum: cartOffer?.postponedPayment?.maxSum,
        paymentPostponeCustomerOrganizationId: cartOffer?.postponedPayment?.customerOrganizationId,
      },
      { transaction },
    );
    for (const offerProductData of cartOffer.products) {
      const requestedProduct = requestedProducts.find(
        el => el.productId === offerProductData.product.id && el.priceOfferId === offerProductData.priceOfferId,
      );
      if (!requestedProduct) continue;

      const offerProduct = await RequestProduct.create(
        {
          isSelected: true,
          quantity: requestedProduct.quantity,
          count: requestedProduct.quantity,
          unitPrice: offerProductData.unitPrice,
          deliveryQuantity: null,
          deliveryTerm: null,
          productId: offerProductData.product.id,
          requestedProductId: requestedProduct.id,
          orderId: offer.id,
          priceOfferId: offerProductData.priceOfferId,
        },
        { transaction },
      );

      await catalogService.reservePricedProduct({ offer, offerProduct }, { transaction });
    }

    await createOrderNotificationService({
      userId: offer.sellerId,
      role: 'seller',
      type: ENotificationType.dummy,
      autoread: false,
      orderRequest: order,
      order: offer,
      io,
      transaction,
    });
  }

  await CartProduct.destroy({
    where: {
      id: userCartProducts.map(el => el.id),
    },
    transaction,
  });

  // Notifications block start
  await createOrderNotificationService({
    userId: user.id,
    role: 'customer',
    type: ENotificationType.dummy,
    autoread: false,
    orderRequest: order,
    io,
    transaction,
  });
  createOrderNotificationForAllManagersService({
    type: ENotificationType.orderInvoicePaymentApproved,
    autoread: false,
    orderRequest: order,
    io,
    transaction,
  });
  // Notifications block end

  return { order };
};
