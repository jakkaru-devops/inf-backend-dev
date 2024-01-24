import { Response } from 'express';
import seq, { Op, Transaction } from 'sequelize';
import httpStatus from 'http-status';
import User from '../../user/models/User.model';
import UserRoles from '../../role/models/UserRoles.model';
import Notification from '../models/Notification.model';
import { APIError } from '../../../utils/api.utils';
import OrderRequest from '../../order/models/OrderRequest.model';
import { ENotificationType } from '../interfaces';
import Order from '../../order/models/Order.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import RefundExchangeRequest from '../../order/models/RefundExchangeRequest.model';
import _ from 'lodash';

interface ITotalUnreadNotificationsCountProps {
  authUser: User;
  authUserRole: UserRoles;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  unreadNotificationsCount: {
    total: number;
    personalArea: number;
    orderRequests: number;
    orders: number;
    orderHistory: number;
    refunds: number;
    organizations: number;
    userComplaints: number;
    productOffers: number;
  };
}

export const getUnreadNotificationsCountService = async ({
  authUser,
  authUserRole,
  res,
  transaction,
}: ITotalUnreadNotificationsCountProps): Promise<IResult> => {
  try {
    let notifications = await Notification.findAll({
      where: {
        userId: authUser.id,
        roleId: authUserRole.roleId,
        type: {
          [Op.ne]: ENotificationType.dummy,
        },
        viewedAt: null,
      },
      include: [{ model: OrderRequest, as: 'orderRequest', attributes: ['status'], required: false }],
      transaction,
    });
    notifications = notifications.map(row => row.toJSON() as Notification);

    const unreadNotificationsCount = {
      total: notifications.length,
      personalArea: notifications.length,
      // orderRequests: notifications.filter(({ type }) =>
      //   [
      //     ENotificationType.offerToOrderRequest,
      //     ENotificationType.createOrderRequest,
      //     ENotificationType.offerExpired,
      //     ENotificationType.requestToUpdateOffer,
      //     ENotificationType.offerUpdated,
      //     ENotificationType.orderPartialPayment,
      //     ENotificationType.requestPaymentRefund,
      //     ENotificationType.paymentRefundRequestPaid,
      //     ENotificationType.orderInvoicePaymentApproved,
      //   ].includes(type),
      // ).length,
      orderRequests: 0,
      // orders: notifications.filter(
      //   ({ type, orderRequest }) =>
      //     [ENotificationType.orderPaid, ENotificationType.orderShipped].includes(type) ||
      //     (!!orderRequest &&
      //       [
      //         ENotificationType.refundProductComplete,
      //         ENotificationType.exchangeProductComplete,
      //         ENotificationType.orderInvoicePaymentConfirmed,
      //       ].includes(type) &&
      //       ['PAID'].includes(orderRequest.status)),
      // ).length,
      orders: 0,
      // orderHistory: notifications.filter(
      //   ({ type, orderRequest }) =>
      //     [ENotificationType.orderCompleted, ENotificationType.rewardPaid].includes(type) ||
      //     (!!orderRequest &&
      //       [ENotificationType.refundProductComplete, ENotificationType.exchangeProductComplete].includes(type) &&
      //       ['COMPLETED'].includes(orderRequest.status)),
      // ).length,
      orderHistory: 0,
      // refunds: notifications.filter(({ type }) =>
      //   [
      //     ENotificationType.refundProductRequest,
      //     ENotificationType.refundProductAccept,
      //     ENotificationType.refundProductDecline,
      //     ENotificationType.exchangeProductRequest,
      //     ENotificationType.exchangeProductAccept,
      //     ENotificationType.exchangeProductDecline,
      //   ].includes(type),
      // ).length,
      refunds: 0,
      organizations: notifications.filter(el => !!el?.organizationId).length,
      userComplaints: notifications.filter(({ type }) => [ENotificationType.newUserComplaint].includes(type)).length,
      customers: notifications.filter(({ type }) => [ENotificationType.customerRegistered].includes(type)).length,
      sellers: notifications.filter(({ type }) => [ENotificationType.sellerUpdateApplicationCreated].includes(type))
        .length,
      productOffers: notifications.filter(({ type }) =>
        [
          ENotificationType.productOfferCreated,
          ENotificationType.productOfferUpdated,
          ENotificationType.productOfferAccepted,
          ENotificationType.productOfferRejected,
        ].includes(type),
      ).length,
    };

    let orderRequests: OrderRequest[] = [];
    if (authUserRole.role.label === 'customer') {
      orderRequests = await OrderRequest.findAll({
        where: {
          status: {
            [Op.or]: ['REQUESTED', 'APPROVED'],
          },
          customerId: authUser.id,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    } else if (authUserRole.role.label === 'seller') {
      orderRequests = await OrderRequest.findAll({
        where: {
          status: {
            [Op.or]: ['REQUESTED', 'APPROVED'],
          },
        },
        include: [
          {
            model: Notification,
            as: 'notifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              // type: {
              //   [Op.ne]: ENotificationType.dummy,
              // },
            },
            required: true,
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    } else if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
      orderRequests = await OrderRequest.findAll({
        where: {
          status: {
            [Op.or]: ['REQUESTED', 'APPROVED'],
          },
          customerId: {
            [Op.ne]: authUser.id,
          },
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    }
    unreadNotificationsCount.orderRequests = _.uniqBy(
      orderRequests
        .flatMap(el => el.orders || [])
        .flatMap(el => el.unreadNotifications || [])
        .concat(orderRequests.flatMap(el => el.unreadNotifications)),
      el => el.id,
    ).length;

    let orders: OrderRequest[] = [];
    if (authUserRole.role.label === 'customer') {
      orders = await OrderRequest.findAll({
        where: {
          status: ['PAID', 'PAYMENT_POSTPONED'],
          customerId: authUser.id,
          hasActiveRefundExchangeRequest: false,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    } else if (authUserRole.role.label === 'seller') {
      orders = await OrderRequest.findAll({
        where: {
          status: ['PAID', 'PAYMENT_POSTPONED'],
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: true,
            where: {
              sellerId: authUser.id,
              hasActiveRefundExchangeRequest: false,
              receivingDate: null,
            },
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    } else if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
      orders = await OrderRequest.findAll({
        where: {
          status: ['PAID', 'PAYMENT_POSTPONED'],
          hasActiveRefundExchangeRequest: false,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    }
    unreadNotificationsCount.orders = _.uniqBy(
      orders
        .flatMap(el => el.orders)
        .flatMap(el => el.unreadNotifications)
        .concat(orders.flatMap(el => el.unreadNotifications)),
      el => el.id,
    ).length;

    let historyOrders: OrderRequest[] = [];
    if (authUserRole.role.label === 'customer') {
      historyOrders = await OrderRequest.findAll({
        where: {
          status: { [Op.or]: ['COMPLETED', 'DECLINED'] },
          customerId: authUser.id,
          hasActiveRefundExchangeRequest: false,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    } else if (authUserRole.role.label === 'seller') {
      historyOrders = await OrderRequest.findAll({
        where: {
          status: { [Op.or]: ['PAID', 'COMPLETED', 'DECLINED'] },
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: true,
            where: {
              sellerId: authUser.id,
              hasActiveRefundExchangeRequest: false,
              receivingDate: {
                [Op.ne]: null,
              },
            },
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    } else if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
      historyOrders = await OrderRequest.findAll({
        where: {
          status: { [Op.or]: ['COMPLETED', 'DECLINED'] },
          hasActiveRefundExchangeRequest: false,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: false,
          },
        ],
      });
    }
    unreadNotificationsCount.orderHistory = _.uniqBy(
      historyOrders
        .flatMap(el => el.orders)
        .flatMap(el => el.unreadNotifications)
        .concat(historyOrders.flatMap(el => el.unreadNotifications)),
      el => el.id,
    ).length;

    let refundOrders: OrderRequest[] = [];
    if (authUserRole.role.label === 'customer') {
      refundOrders = await OrderRequest.findAll({
        where: {
          customerId: authUser.id,
          hasActiveRefundExchangeRequest: true,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: true,
          },
        ],
      });
    } else if (authUserRole.role.label === 'seller') {
      const options: seq.FindOptions = {};
      const orders = await Order.findAll({
        where: { sellerId: authUser.id, hasActiveRefundExchangeRequest: true },
        attributes: ['orderRequestId'],
        include: [
          {
            model: RequestProduct,
            as: 'products',
            required: true,
            include: [
              {
                model: RefundExchangeRequest,
                as: 'refundExchangeRequest',
              },
            ],
          },
        ],
      });
      options.where = {
        id: orders.map(({ orderRequestId }) => orderRequestId),
      };
      options.include = [
        {
          model: Order,
          as: 'orders',
          required: true,
          where: {
            sellerId: authUser.id,
            hasActiveRefundExchangeRequest: true,
          },
          include: [
            {
              model: Notification,
              as: 'unreadNotifications',
              where: {
                userId: authUser.id,
                roleId: authUserRole.roleId,
                viewedAt: null,
                type: {
                  [Op.ne]: ENotificationType.dummy,
                },
              },
              required: false,
            },
          ],
        },
        {
          model: Notification,
          as: 'unreadNotifications',
          where: {
            userId: authUser.id,
            roleId: authUserRole.roleId,
            viewedAt: null,
            type: {
              [Op.ne]: ENotificationType.dummy,
            },
          },
          required: true,
        },
      ];
      refundOrders = await OrderRequest.findAll(options);
    } else if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
      refundOrders = await OrderRequest.findAll({
        where: {
          status: {
            [Op.or]: ['PAID', 'DECLINED', 'COMPLETED'],
          },
          hasActiveRefundExchangeRequest: true,
        },
        include: [
          {
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: Notification,
                as: 'unreadNotifications',
                where: {
                  userId: authUser.id,
                  roleId: authUserRole.roleId,
                  viewedAt: null,
                  type: {
                    [Op.ne]: ENotificationType.dummy,
                  },
                },
                required: false,
              },
            ],
          },
          {
            model: Notification,
            as: 'unreadNotifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              viewedAt: null,
              type: {
                [Op.ne]: ENotificationType.dummy,
              },
            },
            required: true,
          },
        ],
      });
    }
    unreadNotificationsCount.refunds = _.uniqBy(
      refundOrders
        .flatMap(el => el.orders)
        .flatMap(el => el.unreadNotifications)
        .concat(refundOrders.flatMap(el => el.unreadNotifications)),
      el => el.id,
    ).length;

    unreadNotificationsCount.personalArea =
      unreadNotificationsCount.orderRequests +
      unreadNotificationsCount.orders +
      unreadNotificationsCount.orderHistory +
      unreadNotificationsCount.refunds +
      unreadNotificationsCount.productOffers +
      unreadNotificationsCount.organizations +
      unreadNotificationsCount.customers +
      unreadNotificationsCount.sellers +
      unreadNotificationsCount.userComplaints;

    return {
      unreadNotificationsCount,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при получении количества непрочитанных уведомлений',
      error: err,
    });
  }
};
