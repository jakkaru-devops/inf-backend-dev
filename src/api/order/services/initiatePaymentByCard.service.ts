import { Transaction } from 'sequelize';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import User from '../../user/models/User.model';
import OrderRequest from '../models/OrderRequest.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import Order from '../models/Order.model';
import RequestProduct from '../models/RequestProduct.model';
import Product from '../../catalog/models/Product.model';
import Organization from '../../organization/models/Organization.model';
import { gaussRound, round } from '../../../utils/common.utils';
import Reward from '../models/Reward.model';
import { calculateOrderCash } from '../utils';
import { PAYMENTS_ENABLED } from '../../../config/env';
import ordersService from '../orders.service';
import { SocketServer } from '../../../core/socket';
import { Op } from 'sequelize';

interface IProps {
  orderId: OrderRequest['id'];
  juristicSubjectId: JuristicSubject['id'];
}

export const initiatePaymentByCardService = async (
  { orderId, juristicSubjectId }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });

  if (['PAID', 'COMPLETED'].includes(order.status))
    throw new ServiceError({
      status: httpStatus.FORBIDDEN,
      message: 'Ошибка. Заказ уже оплачен',
    });

  if (!!order?.paymentId && !!order?.paymentLink) {
    return {
      paymentId: order.paymentId,
      paymentLink: order.paymentLink,
    };
  }

  const customer = await User.findByPk(order.customerId);

  const selectedOffers = await Order.findAll({
    where: {
      orderRequestId: order.id,
    },
    order: [['createdAt', 'DESC']],
    include: [
      {
        model: RequestProduct,
        as: 'products',
        where: {
          isSelected: true,
          count: { [Op.gt]: 0 },
        },
        required: true,
        include: [{ model: Product, as: 'product' }],
      },
      {
        model: User,
        as: 'seller',
        required: true,
      },
      {
        model: Organization,
        as: 'organization',
        required: true,
      },
    ],
    transaction,
  });
  const selectedProducts = selectedOffers.flatMap(offer => offer.products);

  if (!selectedOffers.length || !selectedProducts.length)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Необходимо выбрать товары и способ доставки в интересующих предложениях',
    });

  // Calculate order total price
  const totalPrice = gaussRound(
    selectedOffers
      .flatMap(({ products }) => products.map(({ unitPrice, count }) => unitPrice * count))
      .reduce((a, b) => a + b, 0),
    2,
  );

  for (const offer of selectedOffers) {
    const offerTotalPrice = offer.products.map(({ unitPrice, count }) => unitPrice * count).reduce((a, b) => a + b, 0);

    const reward =
      (await Reward.findOne({
        where: {
          orderId: offer.id,
        },
        transaction,
      })) ||
      new Reward({
        sellerId: offer.sellerId,
        orderId: offer.id,
      });

    const org = await Organization.findByPk(offer.organizationId, { transaction });

    reward.amount =
      !!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice
        ? 0
        : round(calculateOrderCash(offerTotalPrice, offer.organization.priceBenefitPercent, true));

    await reward.save({ transaction });
    await offer.update({ totalPrice: offerTotalPrice }, { transaction });
  }

  // Mark as paid in development mode
  if (!PAYMENTS_ENABLED) {
    await order.update({
      paymentId: 'DEV',
    });
    const testPaidOrder = await ordersService.markOrderPaidByCard(
      {
        order,
        juristicSubjectId,
        totalPrice,
        selectedOffers,
      },
      { io, transaction },
    );
    return {
      order: testPaidOrder,
    };
  }

  const { paymentId, paymentLink } = await ordersService.generatePaymentLink({
    order,
    customer,
    totalPrice,
    selectedOffers,
    selectedProducts,
  });

  await order.update(
    {
      paymentId,
      paymentLink,
      payerId: juristicSubjectId,
    },
    {
      where: {
        id: order.id,
      },
      transaction,
    },
  );

  return { paymentId, paymentLink };
};
