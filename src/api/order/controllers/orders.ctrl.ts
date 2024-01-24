import { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import fs from 'fs';
import { generatePdfFromTemplate } from '../../../utils/pdf.utils';
import numberToWordsRu from 'number-to-words-ru';
import _ from 'lodash';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import { calculateOrderCash } from '../utils';
import formatDate from 'date-fns/format';
import {
  convertAddressToString,
  gaussRound,
  getPaginationParams,
  getUserName,
  padZero,
  separateNumberBy,
} from '../../../utils/common.utils';
import { UPLOAD_FILES_DIRECTORY } from '../../../config/env';
import Address from '../../address/models/Address.model';
import FileModel from '../../files/models/File.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import Organization from '../../organization/models/Organization.model';
import Product from '../../catalog/models/Product.model';
import RequestProduct from '../models/RequestProduct.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import User from '../../user/models/User.model';
import Reward from '../models/Reward.model';
import UserRoles from '../../role/models/UserRoles.model';
import { getOrderRequestListAsCustomer_service } from '../services/getOrderRequestListAsCustomer.service';
import { getOrderRequestListAsSeller_service } from '../services/getOrderRequestListAsSeller.service';
import { getOrderRequestListAsManager_service } from '../services/getOrderRequestListAsManager.service';
import { getOrderListAsManagerService } from '../services/getOrderListAsManager.service';
import { getOrderListAsSellerService } from '../services/getOrderListAsSeller.service';
import { getOrderListAsCustomerService } from '../services/getOrderListAsCustomer.service';
import { verifyPermissions } from '../../../utils/auth.utils';
import { cancelOrderRequestPaymentService } from '../services/cancelOrderRequestPayment.service';
import { getOrgName } from '../../organization/utils';
import SocketIO from 'socket.io';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import Role from '../../role/models/Role.model';
import { transformAddress } from '../../address/utils';
import { IOrderDocData, IOrderDocSellerData, IOrderRequestDocData, IRequestProduct } from '../interfaces';
import { ENotificationType } from '../../notification/interfaces';
import PaymentRefundRequest from '../models/PaymentRefundRequest.model';
import { generateOrderRequestInvoiceListService } from '../services/generateOrderRequestInvoices.service';
import { createOrderRequestService } from '../services/createOrderRequest.service';
import Region from '../../regions/models/Region.model';
import {
  applicationChangeShippingConditionService,
  approvalOfChangeTransportConditions,
  getReasonToRejectShippingCondition,
} from '../services/changeShippingCondition.service';
import ReasonToRejectShippingCondition from '../models/reasonToRejectShippingCondition.model';
import { getOrderRequestService } from '../services/getOrderRequest.service';
import { getOrderRequestAsSellerService } from '../services/getOrderRequestAsSeller.service';
import { getMonthRewardListService } from '../services/getMonthRewardList.service';
import { updateRefundExchangeRequestService } from '../services/updateRefundExchange.service';
import { createRefundExchangeRequestService } from '../services/createRefundExchangeRequest.service';
import { createOfferService } from '../services/createOffer.service';
import { payOrderRequestService } from '../services/payOrderRequest.service';
import { getSelectedProductListDocPdfService } from '../services/getSelectedProductListDocPdf.service';
import { updateOrderService } from '../services/updateOrder.service';
import { uploadOrderAttachmentService } from '../services/uploadOrderAttachment.service';
import { getOrderService } from '../services/getOrder.service';
import { updateOrderRequestUserStatusService } from '../services/updateOrderRequestUserStatus.service';
import { ORDER_REQUEST_STATUSES, REFUND_EXCHANGE_STATUSES } from '../data/statuses';
import ExcelJS from 'exceljs';
import { EXCEL_COL_STYLE, PRIMARY_COLOR } from '../data';
import { getRefundExchangeListAsManagerService } from '../services/getRefundExchangeListAsManager.service';
import { getRefundExchangeListAsSellerService } from '../services/getRefundExchangeListAsSeller.service';
import { getRefundExchangeListAsCustomerService } from '../services/getRefundExchangeListAsCustomer.service';
import SelectedRegions from '../../regions/models/SelectedRegions.model';
import { addDays, differenceInDays } from 'date-fns';
import { getOrderRequestDocExcelService } from '../services/getOrderRequestDocExcel.service';
import { getOrderRequestDocPdfService } from '../services/getOrderRequestDocPdf.service';
import { DEFAULT_PDF_TEMPLATE_STYLE } from '../../../data/templates.data';
import { htmlToText } from 'html-to-text';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import { payOrderRequestOffersService } from '../services/payOrderRequestOffers.service';
import { acceptOrderPaymentPostponeService } from '../services/acceptOrderPaymentPostpone.service';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import ordersService from '../orders.service';
import { BaseController } from '../../../core/classes/base.controller';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import DescribedProductAutoBrands from '../../catalog/models/DescribedProductAutoBrands.model';
import AutoType from '../../catalog/models/AutoType.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import { getSellersByOrderRequestService } from '../services/getSellersByOrderRequest.service';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import { PUBLIC_PRODUCT_STATUSES } from '../../catalog/data';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';

class OrderCtrl extends BaseController {
  io: SocketIO.Server;

  /**
   * @desc      Get list of order requests
   * @route     GET /order/request/list
   * @params    ? page & pageSize
   * @success 	{ count: number, rows: OrderRequest[] }
   * @access    Private: exploreAllOrderRequestsAvailable, suggestOrdersAvailable, exploreOrderRequestsAndOrdersAvailable
   */
  getOrderRequestList = async (req: Request, res: Response) => {
    try {
      // Manager
      if (verifyPermissions('exploreAllOrderRequestsAvailable', { req }).result) {
        const { data } = await getOrderRequestListAsManager_service({ req });
        return APIResponse({
          res,
          data,
        });
      }

      // Seller
      if (verifyPermissions('suggestOrdersAvailable', { req }).result) {
        const { data } = await getOrderRequestListAsSeller_service({ req });
        return APIResponse({
          res,
          data,
        });
      }

      // Customer
      if (verifyPermissions('exploreOrderRequestsAndOrdersAvailable', { req }).result) {
        const { data } = await getOrderRequestListAsCustomer_service({ req });
        return APIResponse({
          res,
          data,
        });
      }

      throw Error();
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Запросы не загружены',
        error: err,
      });
    }
  };

  /**
   * @desc      Get list of orders
   * @route     GET /order/list
   * @params    ? page & pageSize
   * @success 	{ count: number, rows: OrderRequest[] }
   * @access    Private: exploreAllOrderRequestsAvailable, suggestOrdersAvailable, exploreOrderRequestsAndOrdersAvailable
   */
  getOrderList = async (req: Request, res: Response) => {
    try {
      // Manager
      if (verifyPermissions('exploreAllOrderRequestsAvailable', { req }).result) {
        const { data } = await getOrderListAsManagerService({ req, isHistory: false });
        return APIResponse({
          res,
          data,
        });
      }

      // Seller
      if (verifyPermissions('suggestOrdersAvailable', { req }).result) {
        const { data } = await getOrderListAsSellerService({ req, isHistory: false });
        return APIResponse({
          res,
          data,
        });
      }

      // Customer
      if (verifyPermissions('exploreOrderRequestsAndOrdersAvailable', { req }).result) {
        const { data } = await getOrderListAsCustomerService({ req, isHistory: false });
        return APIResponse({
          res,
          data,
        });
      }

      throw Error();
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Заказы не загружены',
        error: err,
      });
    }
  };

  /**
   * @desc      Get list of orders in history
   * @route     GET /order/history
   * @params    ? page & pageSize & month & year
   * @success 	{ count: number, rows: OrderRequest[] }
   * @access    Private: exploreAllOrderRequestsAvailable, suggestOrdersAvailable, exploreOrderRequestsAndOrdersAvailable
   */
  getOrderHistoryList = async (req: Request, res: Response) => {
    try {
      // Manager
      if (verifyPermissions('exploreAllOrderRequestsAvailable', { req }).result) {
        const { data } = await getOrderListAsManagerService({ req, isHistory: true });
        return APIResponse({
          res,
          data,
        });
      }

      // Seller
      if (verifyPermissions('suggestOrdersAvailable', { req }).result) {
        const { data } = await getOrderListAsSellerService({ req, isHistory: true });
        return APIResponse({
          res,
          data,
        });
      }

      // Customer
      if (verifyPermissions('exploreOrderRequestsAndOrdersAvailable', { req }).result) {
        const { data } = await getOrderListAsCustomerService({ req, isHistory: true });
        return APIResponse({
          res,
          data,
        });
      }

      throw Error();
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'История заказов не загружена',
        error: err,
      });
    }
  };

  /**
   * @desc      Get order request by ID
   * @route     GET /order/request
   * @params    ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: exploreOrderRequestsAndOrdersAvailable
   */
  getOrderRequestById = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const { orderRequest } = await getOrderRequestService({
        id: query.id as string,
        req,
        res,
      });

      return APIResponse({
        res,
        data: orderRequest,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Запрос не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get order request by ID
   * @route     GET /order/request/offers
   * @params    ? id & page & pageSize
   * @success 	{ data: OrderRequest }
   * @access    Private: exploreOrderRequestsAndOrdersAvailable
   */
  getOffersByOrderRequestId = createAPIMethod(
    { errorMessage: 'Запрос с предложениями не загружен', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { id, regionFiasId, filterBy, filterProductId } = req.query as any;

      const { orderRequest, offers, selectedProducts, regions } = await ordersService.getOrderRequestWithOffers({
        orderId: id,
        regionFiasId,
        authUser,
        authUserRole,
        pagination: getPaginationParams(req.query),
        filterBy,
        filterProductId,
      });

      return {
        orderRequest,
        offers,
        selectedProducts,
        regions,
      };
    },
  );

  getOrderRequestOffersRelevance = createAPIMethod(
    { errorMessage: 'Ошибка при получении статуса предложений', runTransaction: false },
    async ({ req, res, authUser }) => {
      const id = req.query.id as string;

      const order = await OrderRequest.findByPk(id, {
        include: [
          {
            model: Order,
            as: 'orders',
            include: [{ model: RequestProduct, as: 'products' }],
          },
        ],
      });

      if (!order)
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Запрос не найден',
        });

      if (order.customerId !== authUser.id)
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Недостачно прав',
        });

      const expiredOffers = order.orders.filter(
        ({ isExpiredOffer, products }) => isExpiredOffer && products.filter(product => product.isSelected).length > 0,
      );

      return {
        result: expiredOffers.length === 0,
        expiredOffers,
      };
    },
  );

  /**
   * @desc      Get customer's current offers state
   * @route     GET /order/request/offers/state
   * @params    ? id
   * @success 	{ data: { totalPrice: number, allowAccept: boolean, allowDownloadSelectedList: boolean } }
   * @access    Private: exploreOrderRequestsAndOrdersAvailable
   */
  getOffersState = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const authUser: User = req.body.authUser;

      const orderRequest = await OrderRequest.findOne({
        where: { id: query.id as string },
        include: [
          {
            model: Order,
            as: 'orders',
            separate: true,
            attributes: ['transportCompanyId', 'isPickup'],
            include: [
              {
                model: RequestProduct,
                as: 'products',
                where: { isSelected: true },
                required: false,
                attributes: ['unitPrice', 'count', 'isSelected'],
              },
            ],
          },
        ],
      });

      if (!orderRequest) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Запрос с id ' + query.id + ' пользователя с id ' + authUser.id + ' не найден',
        });
      }

      // Count order request total price
      const totalPrice = orderRequest.orders
        .flatMap(({ products }) =>
          products.filter(({ isSelected }) => isSelected).map(({ unitPrice, count }) => unitPrice * count),
        )
        .filter(Boolean)
        .reduce((a, b) => a + b, 0);

      // Validate offers
      const considerableOffers = orderRequest.orders.filter(({ products }) => products.length > 0);
      const validOffers = considerableOffers.filter(
        ({ products, transportCompanyId, isPickup }) => products.length > 0 && (transportCompanyId || isPickup),
      );

      const validOffersByProducts = considerableOffers.filter(({ products }) => products.length > 0);

      const allowDownloadSelectedList =
        validOffersByProducts.length > 0 && validOffersByProducts.length === considerableOffers.length;
      const allowAccept = validOffers.length > 0 && validOffers.length === considerableOffers.length;

      return APIResponse({
        res,
        data: {
          totalPrice,
          allowDownloadSelectedList,
          allowAccept,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Текущее состояние выбора предложений не загружено',
        error: err,
      });
    }
  };

  /**
   * @desc      Get order request by ID for seller
   * @route     GET /order/request-seller
   * @params    ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: exploreOrderRequestsAndOrdersAvailable
   */
  getOrderRequestAsSeller = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const { orderRequest } = await getOrderRequestAsSellerService({
        id: query.id as string,
        req,
        res,
      });

      return APIResponse({
        res,
        data: orderRequest,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Запрос не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get order by ID
   * @route     GET /order
   * @params    ? id
   * @success 	{ data: Order }
   * @access    Private: exploreOrderRequestsAndOrdersAvailable
   */
  getOrderById = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const { order } = await getOrderService({ orderId: query.id as string, req, res });

      return APIResponse({
        res,
        data: order,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Запрос не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Create Order Request
   * @route     POST /order/request
   * @body      {
   *              address: Address,
   *              products: RequestProductType[],
   *              selectedSellerIds?: string[],
   *              comment?: string,
   *              fileIds?: string,
   *            }
   * @success 	OrderRequest
   * @access    Private: requestOrdersPlusHistoryAvailable
   */
  createOrderRequest = createAPIMethod(
    { errorMessage: 'Не удалось создать запрос', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      const deliveryAddress: Address = req.body.deliveryAddress;
      const settlements = req.body.settlements;
      const paymentPostponedAt = req.body.paymentPostponedAt;
      const selectedSellerIds: string[] = req.body?.selectedSellerIds;
      const saveSelectedSellers: boolean = req.body?.saveSelectedSellers || undefined;
      const comment: string = req.body?.comment;
      const fileIds: string[] = req.body?.fileIds;
      const requestProducts: IRequestProduct[] = req.body.products;
      const repeatOrder: boolean = req.body.repeatOrder;

      const { orderRequest } = await createOrderRequestService({
        authUser,
        authUserRole,
        deliveryAddress,
        settlements,
        paymentPostponedAt,
        selectedSellerIds,
        saveSelectedSellers,
        comment,
        fileIds,
        requestProducts,
        repeatOrder,
        io: this.io,
        transaction,
      });

      return orderRequest;
    },
  );

  /**
   * @desc      Add an Order to the Order Request
   * @route     POST /order
   * @params    ? orderRequestId
   * @body      { products: RequestProductType[], organizationId: string }
   * @success 	{ data: OrderRequest }
   * @access    Private: suggestOrdersAvailable
   */
  addOrderToRequest = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const requestProducts: IRequestProduct[] =
          typeof req.body.products != 'object' ? JSON.parse(req.body.products) : req.body.products;
        const paymentPostponedAt = req.body.paymentPostponedAt;
        const organizationId = req.body.organizationId;
        const { orderRequest } = await createOfferService({
          organizationId,
          requestProducts,
          paymentPostponedAt,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: orderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Предложение не было добавлено к запросу',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Upload attachment
   * @route     POST /order/attachments
   * @body      { orderId: OrderRequest['id'], group: string }
   * @files     { file: File }
   * @success 	{ result: FileModel, message: string }
   * @access    Private
   */
  uploadAttachment = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const filename = req.body?.filename;
        const orderId = req.body.orderId;
        const offerId = req.body.offerId;
        const group = req.body.group;
        const data = await uploadOrderAttachmentService({
          filename,
          orderId,
          offerId,
          group,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            result: data,
            message: 'Файл загружен',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Файл не загружен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete attachment
   * @route     Delete /order/attachments
   * @query     ? orderRequestFileId
   * @success 	{ message: string }
   * @access    Private
   */
  deleteAttachment = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const orderRequestFile = await OrderRequestFile.findOne({
          where: { id: req.query.orderRequestFileId },
          include: [{ model: FileModel, as: 'file', where: { userId: req.body.authUser.id } }],
          transaction: t,
        });

        if (!orderRequestFile)
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Файл не был найден',
          });

        await orderRequestFile.destroy({
          transaction: t,
        });

        await orderRequestFile.file.destroy({
          transaction: t,
        });

        await fs.promises.unlink(`${UPLOAD_FILES_DIRECTORY}/${orderRequestFile.file.path}`);

        return APIResponse({
          res,
          data: {
            message: 'Файл удалён',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Файл не был удалён',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Update the Order Request
   * @route     PUT /order/request
   * @params    ? id
   * @body      { address?: Address, products?: RequestProductType[] }
   * @success 	{ data: OrderRequest }
   * @access    Private: manageOrderRequestsAvailable
   */
  updateOrderRequest = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;
        const authUser: User = req.body.authUser;
        const requestProducts: IRequestProduct[] = req.body?.products;
        const delliveryAddress: Address = req.body?.address;

        const options: seq.FindAndCountOptions = {};

        options.where = { id: query.id, customerId: authUser.id };

        options.include = [];

        options.include.push({
          model: RequestProduct,
          as: 'products',
          required: true,
          separate: true,
        });

        options.include.push({
          model: Address,
          as: 'address',
          required: false,
        });

        const orderRequest = await OrderRequest.findOne(options);

        console.log(query.id, orderRequest);

        if (!orderRequest) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Запроса на заказ не найден',
          });
        }

        if (delliveryAddress) {
          const address = await Address.findOne({ where: { id: orderRequest.deliveryAddressId } });

          await address.update(
            transformAddress({
              ...orderRequest.address,
              ...delliveryAddress,
            }),
          );
        }

        if (requestProducts) {
          const products = await RequestProduct.findAll({ where: { orderRequestId: orderRequest.id } });

          await RequestProduct.destroy({ where: { id: products.map(({ id }) => id) } });

          for (const { productId, quantity } of requestProducts) {
            await RequestProduct.create({
              orderRequestId: orderRequest.id,
              productId,
              quantity,
            });
          }
        }

        const updatedOrderRequest = await OrderRequest.findOne(options);

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,
          transaction,
        });

        return APIResponse({
          res,
          data: updatedOrderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Обновление запроса на заказ не удалось',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Request To Update Order
   * @route     POST /order/requestToUpdate
   * @body      {
   *              orderId: string,
   *            }
   * @success 	{ order: Order }
   * @access    Private
   */
  requestToUpdateOrder = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { orderId } = req.body;

        const order = await Order.findByPk(orderId, {
          include: [
            {
              model: OrderRequest,
              as: 'orderRequest',
            },
          ],
          transaction,
        });

        if (!order.isExpiredOffer)
          return APIError({
            res,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Срок предложения еще не истек',
          });

        await order.update(
          {
            isRequestedToUpdateOffer: true,
          },
          { transaction },
        );
        await order.orderRequest.update(
          {
            customerLastNotificationCreatedAt: new Date(),
          },
          { transaction },
        );

        await createOrderNotificationService({
          userId: order.sellerId,
          role: 'seller',
          type: ENotificationType.requestToUpdateOffer,
          autoread: false,
          orderRequest: order.orderRequest,
          order,
          io: this.io,
          transaction,
        });

        await createOrderNotificationForAllManagersService({
          type: ENotificationType.requestToUpdateOffer,
          autoread: false,
          orderRequest: order.orderRequest,
          order,
          io: this.io,
          res,
          transaction,
        });

        await updateOrderRequestUserStatusService({
          orderRequestId: order.orderRequestId,
          sellerIds: [order.sellerId],
          transaction,
        });

        return APIResponse({
          res,
          data: order,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Запрос на обновление не отправлен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Update the Order
   * @route     PUT /order
   * @params    ? id
   * @body      {
   *              products?: RequestProductType[],
   *              totalPrice?: number,
   *              trackNumber?: string,
   *              departureDate?: Date,
   *              receivingDate?: Date
   *            }
   * @success 	{ data: Order }
   * @access    Private: suggestOrdersAvailable || manageOrderRequestsAvailable
   */
  updateOrder = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;
        const requestProducts: IRequestProduct[] = req.body?.products;
        const organizationId: string = req.body?.organizationId;
        const trackNumber: string = req.body?.trackNumber;
        const departureDate: Date = req.body?.departureDate;
        const receivingDate: Date = req.body?.receivingDate;

        const { order, orderRequest } = await updateOrderService({
          orderId: query.id as string,
          organizationId,
          requestProducts,
          trackNumber,
          departureDate,
          receivingDate,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            order,
            orderRequest,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Предложение не обновлено',
          error: err,
        });
      }
    });
  };

  updateOrderRequestManager = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.params;
        const requestProducts: IRequestProduct[] = req.body?.products;
        const userCustomerId: User['id'] = req.body?.user;
        const nowDate = new Date();

        const options: seq.FindAndCountOptions = {};

        options.where = { id: id, customerId: userCustomerId };

        options.include = [];

        options.include.push({
          model: RequestProduct,
          as: 'products',
          required: true,
          separate: true,
          include: [
            {
              model: DescribedProduct,
              as: 'describedProduct',
              required: false,
              include: [
                {
                  model: DescribedProductAutoBrands,
                  as: 'autoBrandsData',
                  required: false,
                  include: [
                    {
                      model: AutoType,
                      as: 'autoType',
                      required: false,
                    },
                    { model: AutoBrand, as: 'autoBrand', required: false },
                  ],
                },
              ],
            },
          ],
        });

        options.include.push({
          model: Address,
          as: 'address',
          required: false,
        });

        const orderRequest = await OrderRequest.findOne(options);

        if (!orderRequest) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Запроса на заказ не найден',
          });
        }

        const products = await RequestProduct.findAll({ where: { orderRequestId: orderRequest.id } });
        const describedProductId = products[0].describedProductId;
        const productsWithIds = products.filter(({ product }) => product);

        if (requestProducts) {
          await DescribedProductAutoBrands.destroy({ where: { describedProductId: describedProductId } });
          for (const { describedProductData } of requestProducts) {
            if (!describedProductData?.productGroupIds?.length && !describedProductData?.autoBrands?.length) {
              throw APIError({
                res,
                status: httpStatus.BAD_REQUEST,
                message: 'Необходимо указать категории товаров',
              });
            }

            await DescribedProduct.update(
              {
                productGroupIds: describedProductData.productGroupIds,
              },
              { where: { id: describedProductId }, returning: true, transaction },
            );

            for (const autoBrandData of describedProductData.autoBrands) {
              console.log('autoBrandData', autoBrandData);
              await DescribedProductAutoBrands.create({
                describedProductId: describedProductId,
                autoTypeId: autoBrandData.autoTypeId,
                autoBrandId: autoBrandData.autoBrandId,
              });
            }
            await OrderRequest.update(
              { describedProductId: describedProductId, quantity: 1 },
              {
                where: {
                  id: orderRequest.id,
                },
                transaction,
              },
            );
          }
        }

        const authUser = await User.findByPk(userCustomerId);

        const sellers = await getSellersByOrderRequestService({
          selectedSellerIds: [],
          settlements: [],
          requestProducts,
          authUser,
          transaction,
        });

        if (!!sellers?.length) {
          const products = await Product.findAll({
            where: {
              id: productsWithIds.map(el => el.productId),
            },
            attributes: ['id'],
            transaction,
          });
          for (const seller of sellers) {
            const sellerAutoBrands = await SellerAutoBrands.findAll({
              where: {
                userId: seller.id,
              },
              transaction,
            });
            const sellerProductGroups = await SellerProductGroups.findAll({
              where: {
                userId: seller.id,
              },
              transaction,
            });
            const sellerProductIds: string[] = [];

            for (const product of products) {
              const branches = await ProductBranch.findAll({
                where: {
                  productId: product.id,
                  status: PUBLIC_PRODUCT_STATUSES,
                },
                transaction,
              });

              for (const branch of branches) {
                if (!!branch?.autoTypeId || !!branch?.autoBrandId) {
                  if (!!branch?.autoTypeId && !!branch?.autoBrandId) {
                    if (
                      !!sellerAutoBrands.find(
                        el => el?.autoTypeId === branch?.autoTypeId && el?.autoBrandId === el?.autoBrandId,
                      )
                    ) {
                      sellerProductIds.push(product.id);
                    }
                  }
                  if (!!branch?.autoTypeId && !branch?.autoBrandId) {
                    if (!!sellerAutoBrands.find(el => el?.autoTypeId === branch?.autoTypeId)) {
                      sellerProductIds.push(product.id);
                    }
                  }
                  if (!branch?.autoTypeId && !!branch?.autoBrandId) {
                    if (!!sellerAutoBrands.find(el => el?.autoBrandId === branch?.autoBrandId)) {
                      sellerProductIds.push(product.id);
                    }
                  }
                }
                if (!!branch?.groupId) {
                  if (!!sellerProductGroups?.find(el => el?.productGroupId === branch?.groupId)) {
                    sellerProductIds.push(product.id);
                  }
                }
              }
            }

            await OrderRequestSellerData.destroy({ where: { orderRequestId: orderRequest.id } });

            await OrderRequestSellerData.create(
              {
                orderRequestId: orderRequest.id,
                sellerId: seller.id,
                productsNumber: sellerProductIds.length,
                productIds: JSON.stringify(sellerProductIds),
                describedProductsNumber: requestProducts?.length,
                lastNotificationCreatedAt: nowDate,
                sellerStatus: 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION',
              },
              { transaction },
            );
          }
        }

        const updatedOrderRequest1 = await OrderRequest.findOne(options);

        return APIResponse({
          res,
          data: updatedOrderRequest1,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Обновление запроса на заказ не удалось',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Small updates to the Order
   * @route     PATCH /order
   * @params    ? id
   * @body      {
   *              products: { id: string; count: number; isSelected: boolean }[],
   *              transportCompanyId?: TransportCompany['id]
   *            }
   * @success 	{ data: { message: string } }
   * @access    Private: manageOrderRequestsAvailable
   */
  patchOrder = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.query;
        const products: { id: string; count: number; isSelected: boolean }[] = req.body?.products || [];
        const transportCompanyId: TransportCompany['id'] = req.body?.transportCompanyId;

        for (let i = 0; i < products.length; i++) {
          const product = products[i];
          await RequestProduct.update(
            {
              isSelected: product.isSelected,
              count: product.count,
            },
            { where: { id: product.id }, transaction },
          );
        }

        if (typeof transportCompanyId !== 'undefined') {
          await Order.update(
            {
              transportCompanyId: transportCompanyId !== 'pickup' ? transportCompanyId : null,
              isPickup: transportCompanyId === 'pickup',
            },
            { where: { id }, transaction },
          );
        }

        return APIResponse({
          res,
          data: { message: 'Данные обновлены' },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Предложение не обновлено',
          error: err,
        });
      }
    });
  };

  /**
   * application to change shipping condition by customer
   * @route /order/change-transport-company/:id
   * @body {
   *   transportCompanyId?: TransportCompany['id]
   * }
   * @success 	{ data: { message: string } }
   * @access    Private: manageOrderRequestsAvailable
   * */

  applicationShippingCondition = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.params;
        const transportCompanyId: TransportCompany['id'] = req.body?.transportCompanyId;

        await applicationChangeShippingConditionService(id, transportCompanyId, this.io, res, transaction);

        return APIResponse({
          res,
          data: {
            message: 'Запрос на изменение условий доставки успешно отправлен',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'произошла ошибка при отправлении запроса на изменение условий доставки',
          error: err,
        });
      }
    });
  };

  approvedShippingCondition = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.params;
        const approved: boolean = req.body?.approved;
        const userId: User = req.body.authUser;
        const reason: string = req.body?.reason;

        await approvalOfChangeTransportConditions(id, approved, userId, reason, res, this.io, transaction);

        return APIResponse({
          res,
          data: {
            message: 'Условия доставки изменены',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'произошла ошибка при изменении условий доставки',
          error: err,
        });
      }
    });
  };

  getReasonReject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reasonData = await getReasonToRejectShippingCondition(id);
      return APIResponse({
        res,
        data: reasonData,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: ' произошла ошибка при показе причины отказа',
        error: err,
      });
    }
  };
  deleteReasonReject = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await ReasonToRejectShippingCondition.destroy({
        where: { orderId: id },
      });
      return APIResponse({
        res,
        data: { message: 'Удаление прошло успешно' },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при удалении причины',
      });
    }
  };

  /**
   * @desc      Small updates to the Order
   * @route     PUT /order/request/partly-paid
   * @params    ? id
   * @body      {
   *              orders: { id: string; products: { id: string; count: number }[] }[]
   *            }
   * @success 	{ message: string, orderRequest: OrderRequest }
   * @access    Private: exploreOrderRequestsAndOrdersAvailable
   */
  updatePartlyPaidOrder = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const id = req?.query?.id as string;
        const orders: { id: string; products: { id: string; count: number }[] }[] = req.body.orders;

        if (orders.length < 2 && orders[0].products.length === 0) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Нельзя удалить единственный товар в заказе',
          });
        }

        let orderRequest = await OrderRequest.findByPk(id, {
          include: [
            {
              model: Order,
              as: 'orders',
              required: true,
              include: [{ model: RequestProduct, as: 'products' }],
            },
          ],
          transaction,
        });

        if (authUser.id !== orderRequest.customerId) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Недостаточно прав для обновления заказа',
          });
        }

        for (let i = 0; i < orderRequest.orders.length; i++) {
          const orderEntity = orderRequest.orders[i];
          const orderData = orders.find(({ id }) => id === orderEntity.id);

          if (!orderData || !orderData.products.length) {
            await orderEntity.destroy({ transaction });
            continue;
          }

          for (let j = 0; j < orderEntity.products.length; j++) {
            const productEntity = orderEntity.products[j];
            const productData = orderData.products.find(({ id }) => id === productEntity.id);

            if (!!productData) {
              await productEntity.update(
                {
                  count: productData.count,
                },
                {
                  transaction,
                },
              );
            } else {
              await productEntity.destroy({ transaction });
            }
          }
        }

        orderRequest = await OrderRequest.findByPk(id, {
          include: [
            {
              model: Order,
              as: 'orders',
              required: true,
              include: [{ model: RequestProduct, as: 'products' }],
            },
          ],
          transaction,
        });

        let totalPrice = 0;
        for (const orderEntity of orderRequest.orders) {
          const orderTotalPrice = orderEntity.products
            .filter(product => product.isSelected)
            .map(product => product.count * product.unitPrice)
            .reduce((a, b) => a + b, 0);
          await orderEntity.update(
            {
              totalPrice: orderTotalPrice,
            },
            {
              transaction,
            },
          );
          totalPrice += orderTotalPrice;
        }

        const status: OrderRequest['status'] = orderRequest.paidSum >= totalPrice ? 'PAID' : orderRequest.status;
        orderRequest = await orderRequest.update(
          {
            totalPrice,
            status,
          },
          { transaction },
        );

        if (status === 'PAID') {
          const offers = await Order.findAll({
            include: [{ model: RequestProduct, as: 'products' }],
            transaction,
          });
          for (const offer of offers) {
            const deleteProductsIds = offer.products.filter(product => !product.isSelected).map(product => product.id);
            await RequestProduct.destroy({
              where: {
                id: deleteProductsIds,
              },
              transaction,
            });

            let offerPrice = offer.products
              .filter(product => product.isSelected)
              .map(product => product.count * product.unitPrice)
              .reduce((a, b) => a + b, 0);
            if (!offerPrice) {
              await offer.destroy({
                transaction,
              });
              continue;
            }

            let offerStatus: Order['status'] = null;
            if (!!offer.paidSum) {
              if (offer.paidSum >= offerPrice) offerStatus = 'PAID';
            } else {
              offerStatus = 'PAID';
            }

            if (offerStatus === 'PAID') {
              await offer.update(
                {
                  status: offerStatus,
                  paymentDate: new Date(),
                },
                {
                  transaction,
                },
              );
            }
          }
        }

        if (status === 'PAID') {
          await orderRequest.update(
            {
              paymentDate: new Date(),
            },
            {
              transaction,
            },
          );
        }

        await OrderRequestFile.destroy({
          where: { orderRequestId: orderRequest.id, group: 'invoice' },
          transaction,
        });
        const files = await generateOrderRequestInvoiceListService({
          orderRequestId: orderRequest.id,
          juristicSubjectId: orderRequest.payerId,
          req,
          transaction,
        });

        if (!files.length) {
          throw APIError({
            res,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Новые счета-договора не сформированы',
          });
        }

        orderRequest = await OrderRequest.findByPk(id, {
          include: [
            {
              model: Order,
              as: 'orders',
              required: true,
            },
          ],
          transaction,
        });

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            message: 'Заказ обновлен',
            orderRequest,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Заказ не обновлен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Unselect all RequestProducts by Product Id
   * @route     PATCH /order/request/selected-list
   * @params    ? productId
   * @success 	{ data: { message: string } }
   * @access    Private: manageOrderRequestsAvailable
   */
  unselectAllProducts = async (req: Request, res: Response) => {
    try {
      const { productId } = req.query;

      const requestProducts = await RequestProduct.findAll({
        where: { productId },
        attributes: ['id'],
      });

      requestProducts.forEach(async product => product.update({ isSelected: false }));

      return APIResponse({
        res,
        data: { message: 'Данные обновлены' },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Предложение не обновлено',
        error: err,
      });
    }
  };

  /**
   * @desc      Approve Order Request
   * @route     POST /order/request/approve
   * @params    ? id & paymentType: 'card' | 'invoice'
   * @body      jurSubjectId: string
   * @success 	{ orderRequest: OrderRequest, invoicePayment?: { url: string } }
   * @access    Private: manageOrderRequestsAvailable
   */
  approveOrderRequest = createAPIMethod(
    { errorMessage: 'Статус заказа не обновлён', runTransaction: true },
    async ({ req, transaction }) => {
      const { query } = req;
      const jurSubjectId = req.body.jurSubjectId;
      const paymentType = query.paymentType as 'card' | 'invoice';
      const data = await ordersService.approveOrderRequest(
        {
          orderRequestId: query.id as string,
          jurSubjectId,
          paymentType,
        },
        { req, io: this.io, transaction },
      );
      return data;
    },
  );

  /**
   * @desc      Generate selected products list PDF
   * @route     GET /order/request/selected-list
   * @params    ? id & mode: 'list' | 'extended'
   * @success 	Buffer
   * @access    Private: manageOrderRequestsAvailable
   */
  getSelectedProductListDocPdf = createAPIMethod(
    { errorMessage: 'Список выбранных товаров не был сгенерирован', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { query } = req;
      const mode = query?.mode as 'extended' | 'list';

      const { file } = await getSelectedProductListDocPdfService({
        orderId: query?.id as string,
        mode,
        authUser,
        authUserRole,
      });

      return file.toString('base64');
    },
  );

  /**
   * @desc      Decline Order Request
   * @route     POST /order/request/decline
   * @params    ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: manageOrderRequestsAvailable
   */
  declineOrderRequest = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;

        const options: seq.FindAndCountOptions = {};

        options.where = { id: query.id };
        options.include = [
          {
            model: Order,
            as: 'orders',
            separate: true,
            include: [
              {
                model: RequestProduct,
                as: 'products',
                required: true,
                separate: true,
              },
            ],
          },
        ];

        options.transaction = transaction;

        const orderRequest = await OrderRequest.findOne(options);

        const updatedOrderRequest = await orderRequest.update({ status: 'DECLINED' }, { transaction });

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,

          transaction,
        });

        return APIResponse({
          res,
          data: updatedOrderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Статус запроса на заказ не обновлён',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Pay Order Request
   * @route     POST /order/request/payment
   * @query     ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: manageOrderRequestsAvailable
   */
  payOrderRequest = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;
        const { orderRequest } = await payOrderRequestService({
          orderRequestId: query.id as string,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: orderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Заказ не оплачен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Mark Order Request as partially paid
   * @route     POST /order/request/partial-payment
   * @query     ? id
   * @body      { paidSum: number }
   * @success 	{ data: OrderRequest }
   * @access    Private: exploreAllOrderRequestsAvailable
   */
  markOrderRequestPartialPayment = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.query.id as string;
        const paidSum: number = req.body.paidSum;

        const orderRequest = await OrderRequest.findOne({
          where: {
            id,
          },
          transaction,
        });
        if (!orderRequest || !paidSum)
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Некорректое тело запроса',
          });

        if (paidSum >= orderRequest.totalPrice)
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Некорректое сумма',
          });

        await orderRequest.update(
          {
            paidSum,
          },
          {
            transaction,
          },
        );

        await createOrderNotificationService({
          userId: orderRequest.customerId,
          role: 'customer',
          type: ENotificationType.orderPartialPayment,
          autoread: false,
          orderRequest,
          io: this.io,
          transaction,
        });

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,

          transaction,
        });

        return APIResponse({
          res,
          data: { success: true },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка. Частичная оплата не зафиксирована',
          error: err,
        });
      }
    });
  };

  payOrderRequestOffers = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const orderRequestId = req.query?.id as string;
        const offersData: Order[] = req.body.offers;

        const { orderRequest } = await payOrderRequestOffersService({
          orderRequestId,
          offersData,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: orderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка. Оплата не зафиксирована',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Request payment refund on OrderRequest
   * @route     POST /order/request/payment-refund-request
   * @query     ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: manageOrderRequestsAvailable
   */
  requestPaymentRefund = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.query.id as string;

        const orderRequest = await OrderRequest.findOne({
          where: {
            id,
          },
          transaction,
        });
        if (!orderRequest)
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Некорректое тело запроса',
          });

        const paymentRefundRequest = await PaymentRefundRequest.create(
          {
            orderRequestId: id,
          },
          { transaction },
        );

        await orderRequest.update(
          {
            customerLastNotificationCreatedAt: new Date(),
          },
          { transaction },
        );

        await createOrderNotificationForAllManagersService({
          type: ENotificationType.requestPaymentRefund,
          autoread: false,
          orderRequest,
          io: this.io,
          res,
          transaction,
        });

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,

          transaction,
        });

        return APIResponse({
          res,
          data: paymentRefundRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка. Запрос на возврат денежных средств не отправлен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Pay for payment refund request on OrderRequest
   * @route     POST /order/request/pay-refund-request
   * @query     ? id
   * @body      { refundSum: number }
   * @success 	{ data: OrderRequest }
   * @access    Private: manageOrderRequestsAvailable
   */
  payPaymentRefundRequest = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.query.id as string;
        const refundSum: number = req.body.refundSum;

        let orderRequest = await OrderRequest.findOne({
          where: {
            id,
          },
          include: [
            {
              model: PaymentRefundRequest,
              as: 'paymentRefundRequest',
              required: false,
              order: [['createdAt', 'DESC']],
            },
          ],
          transaction,
        });
        if (!orderRequest)
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Некорректое тело запроса',
          });

        let paymentRefundRequest = orderRequest?.paymentRefundRequest;
        if (!paymentRefundRequest) {
          paymentRefundRequest = await PaymentRefundRequest.create(
            {
              orderRequestId: orderRequest.id,
              refundSum,
            },
            { transaction },
          );
        } else {
          paymentRefundRequest = await orderRequest.paymentRefundRequest.update(
            {
              refundSum,
            },
            { transaction },
          );
        }

        await orderRequest.update(
          {
            managerLastNotificationCreatedAt: new Date(),
          },
          { transaction },
        );

        orderRequest = orderRequest.toJSON() as OrderRequest;
        orderRequest.paymentRefundRequest = paymentRefundRequest.toJSON() as PaymentRefundRequest;

        await createOrderNotificationService({
          userId: orderRequest.customerId,
          role: 'customer',
          type: ENotificationType.paymentRefundRequestPaid,
          autoread: false,
          orderRequest,
          io: this.io,
          transaction,
        });

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,

          transaction,
        });

        return APIResponse({
          res,
          data: paymentRefundRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка. Запрос на возврат денежных средств не отправлен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Cancel Order Request payment - restore deleted offers with products
   * @route     POST /order/request/cancel-payment
   * @query     ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: requestOrdersPlusHistoryAvailable
   */
  cancelOrderRequestPayment = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { query } = req;

        const { error } = await cancelOrderRequestPaymentService({
          id: query.id as string,
          req,
          transaction: t,
        });
        if (error) {
          throw APIError({
            res,
            ...error,
          });
        }

        return APIResponse({
          res,
          data: {
            message: 'Оплата заказа успешно отменена',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка. Оплата не отменена',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Complete Order Request
   * @route     POST /order/request/complete
   * @params    ? id
   * @success 	{ data: OrderRequest }
   * @access    Private: manageOrderRequestsAvailable
   */
  completeOrderRequest = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;

        const options: seq.FindAndCountOptions = {
          transaction,
        };

        options.where = { id: query.id };
        options.include = [
          {
            model: Order,
            as: 'orders',
            separate: true,
            include: [
              {
                model: RequestProduct,
                as: 'products',
                required: true,
                separate: true,
              },
            ],
          },
        ];

        const orderRequest = await OrderRequest.findOne(options);

        const updatedOrderRequest = await orderRequest.update({ status: 'COMPLETED' }, { transaction });

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,

          transaction,
        });

        return APIResponse({
          res,
          data: updatedOrderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Статус запроса на заказ не обновлён',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete order request
   * @route     DELETE /order/request
   * @success 	{ id: string, message: string }
   * @access    Private: manageOrderRequestsAvailable
   */
  deleteOrderRequest = async (req: Request, res: Response) => {
    try {
      const { query } = req;

      const orderRequest = await OrderRequest.findByPk(query.id as string, {
        attributes: ['id', 'idOrder'],
      });
      await OrderRequest.destroy({ where: { id: query.id } });

      return APIResponse({
        res,
        data: {
          message: `Запрос ${orderRequest.idOrder} удалён`,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Запрос не был удалён',
        error: err,
      });
    }
  };

  /**
   * @desc      Delete order
   * @route     DELETE /order
   * @success 	{ id: string, message: string }
   * @access    Private: suggestOrdersAvailable
   */
  deleteOrder = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;
        const order = await Order.findByPk(query.id as string, {
          transaction,
        });
        await order.destroy({
          transaction,
        });

        await updateOrderRequestUserStatusService({
          orderRequestId: order.orderRequestId,
          sellerIds: [order.sellerId],

          transaction,
        });

        return APIResponse({
          res,
          data: 'Предложение было успешно удалено с id ' + query.id,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Предложение не было удалено',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get all orders with refund/exchange requests
   * @route     GET /order/refund-exchange/all
   * @params  	? page & pageSize
   * @success 	{ data: OrderRequest[] }
   * @access    Private: exploreAllOrderRequestsAvailable
   */
  getAllOrdersWithRefundExchangeRequests = async (req: Request, res: Response) => {
    try {
      const { data: orderRequests } = await getRefundExchangeListAsManagerService({ req });

      return APIResponse({
        res,
        data: orderRequests,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список заказов с возвратами/обменами не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get order list with refund/exchange requests
   * @route     GET /order/refund-exchange/list
   * @params  	? page & pageSize
   * @success 	{ data: OrderRequest[] }
   * @access    Private: exploreAllOrderRequestsAvailable
   */
  getOrderListWithRefundExchangeRequests = async (req: Request, res: Response) => {
    try {
      const authUserRole: UserRoles = req.body.authUserRole;

      let orderRequests: { count: number; rows: OrderRequest[] } = null;
      if (authUserRole.role.label === 'seller') {
        const { data } = await getRefundExchangeListAsSellerService({ req });
        orderRequests = data;
      }
      if (authUserRole.role.label === 'customer') {
        const { data } = await getRefundExchangeListAsCustomerService({ req });
        orderRequests = data;
      }

      return APIResponse({
        res,
        data: orderRequests,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список заказов с возвратами/обменами не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Rerquest a refund/exchange
   * @route     POST /order/refund-exchange
   * @body    	{
   *              requestProductId: string,
   *              disputeResolution: 'REFUND' | 'EXCHANGE',
   *              quantity: number,
   *              reason: RefundExchangeReasonType[],
   *              comment?: string
   *            }
   * @success 	{ data: RefundExchangeRequest }
   * @access    Private: requestOrdersPlusHistoryAvailable
   */
  requestRefundExchange = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { requestProductId, orderId, disputeResolution, quantity, reason, comment } = req.body;
        const { refundExchangeRequest } = await createRefundExchangeRequestService({
          requestProductId,
          orderId,
          disputeResolution,
          quantity,
          reason,
          comment,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: refundExchangeRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось подать заявку на возврат/обмен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Rerquest a refund/exchange
   * @route     PUT /order/refund-exchange
   * @params  	? id & reject
   * @body    	{ reply?: string }
   * @success 	{ data: OrderRequest[] }
   * @access    Private: customer, seller, manager
   */
  updateRefundExchange = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;
        const reply = req.body.reply as string;

        const { refundExchangeRequest } = await updateRefundExchangeRequestService({
          id: query.id as string,
          reply,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: refundExchangeRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить заявку на возврат/обмен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get all Rewards
   * @route     GET /order/reward/list
   * @params 	  ? page & pageSize
   * @success 	{ rows: Reward[], count: number }
   * @access    Private: itself
   */
  getAllRewards = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const isAdmin = ['operator', 'manager'].includes(authUserRole.role.label);
      let sellerId: User['id'] = isAdmin ? (req?.query?.sellerId as string) || null : authUser.id;
      const paginationParams = getPaginationParams(req.query, 10);
      const yearFilter = Number(req.query?.year) || null;
      let monthFilter = (req.query?.month as string) || null;

      const options: seq.FindOptions = {
        order: [['givenAt', 'DESC']],
      };

      options.where = {
        givenAt: {
          [Op.ne]: null,
        },
      };
      if (!!sellerId) {
        options.where['sellerId'] = sellerId;
      }

      options.include = [
        {
          model: Order,
          as: 'order',
          required: true,
          include: [
            {
              model: OrderRequest,
              as: 'orderRequest',
              required: true,
            },
          ],
        },
      ];
      if (isAdmin) {
        options.include.push({
          model: User,
          as: 'seller',
          required: true,
        });
      }

      function getDaysNumberInMonth(month: number, year: number) {
        return new Date(year, month, 0).getDate();
      }

      const rewards = await Reward.findAll(options);

      interface IRewardGroup {
        month: string;
        rewards: Reward[];
        ordersSum: number;
        rewardSum: number;
        seller?: User;
      }
      const rewardGroupsObj: { [month: string]: Reward[] } = rewards.reduce((a, reward) => {
        const rewardDate = new Date(reward.givenAt);
        const monthDays = getDaysNumberInMonth(rewardDate.getMonth() + 1, rewardDate.getFullYear());
        const monthPeriod: string = new Date(reward.givenAt).getDate() < 16 ? '01-15' : `16-${monthDays}`;
        const key = `${monthPeriod}.${reward.givenAtMonth}`;
        a[key] = (a[key] || []).concat(reward.toJSON());
        return a;
      }, {});
      let rewardGroups: IRewardGroup[] = isAdmin
        ? Object.keys(rewardGroupsObj).flatMap(month => {
            const allMonthRewards = rewardGroupsObj[month];
            const rewardsGroupedBySellers = _.groupBy(allMonthRewards, 'sellerId');
            const monthRewardsBySellers = Object.values(rewardsGroupedBySellers);

            const result: IRewardGroup[] = [];
            for (let i = 0; i < monthRewardsBySellers.length; i++) {
              const sellerRewards = _.uniqBy(monthRewardsBySellers[i], 'orderId');
              const rewardsSum = sellerRewards.map(({ amount }) => amount).reduce((a, b) => a + b, 0);
              result.push({
                month,
                rewards: sellerRewards,
                ordersSum: Number(
                  gaussRound(
                    sellerRewards.map(({ order: { totalPrice } }) => totalPrice).reduce((a, b) => a + b, 0),
                    2,
                  ),
                ),
                rewardSum: gaussRound(rewardsSum, 2),
                seller: sellerRewards?.[0]?.seller,
              });
            }

            return result;
          })
        : Object.keys(rewardGroupsObj).map(month => {
            const monthRewards = _.uniqBy(rewardGroupsObj[month], 'orderId');
            const rewardSum = monthRewards.map(({ amount }) => amount).reduce((a, b) => a + b, 0);

            return {
              month,
              rewards: monthRewards,
              ordersSum: Number(
                gaussRound(
                  monthRewards.map(({ order: { totalPrice } }) => totalPrice).reduce((a, b) => a + b, 0),
                  2,
                ),
              ),
              rewardSum: gaussRound(rewardSum, 2),
            };
          });

      const getYears = (rewardGroups: IRewardGroup[]) => {
        const from = Number(rewardGroups?.[rewardGroups.length - 1]?.month.split('.')?.[2] || new Date().getFullYear());
        const to = Number(rewardGroups?.[0]?.month.split('.')?.[2] || new Date().getFullYear());
        const result: number[] = [];
        for (let i = from; i <= to; i++) {
          result.push(i);
        }
        return result;
      };
      const years = getYears(rewardGroups);
      const months = _.uniq(
        [
          'Январь',
          'Февраль',
          'Март',
          'Апрель',
          'Май',
          'Июнь',
          'Июль',
          'Август',
          'Сентябрь',
          'Октябрь',
          'Ноябрь',
          'Декабрь',
        ].filter((__, i) => !!rewardGroups.find(({ month }) => month.split('.')[1] === padZero(i + 1))),
      );
      const filters = {
        years,
        months,
      };

      if (!!yearFilter) {
        rewardGroups = rewardGroups.filter(({ month }) => month.includes(yearFilter.toString()));
        if (!!monthFilter && !rewardGroups.find(({ month }) => month.includes(yearFilter.toString()))) {
          monthFilter = null;
        }
      }
      if (!!monthFilter) {
        rewardGroups = rewardGroups.filter(({ month }) => month.split('.')[1] === monthFilter);
      }

      const result = {
        rewardGroups: {
          count: rewardGroups.length,
          rows: rewardGroups.filter(
            (__, i) => i >= paginationParams.offset && i < paginationParams.offset + paginationParams.limit,
          ),
        },
        filters,
      };

      return APIResponse({
        res,
        data: result,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список вознаграждений не получен',
        error: err,
      });
    }
  };

  /**
   * @desc      Update the Reward
   * @route     PUT /order/reward
   * @params    ? orderId
   * @body      { supplierPaid?: boolean, sellerPaid?: boolean }
   * @success 	{ data: Reward }
   * @access    Private: rewardsAvailable
   */
  updateReward = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { query } = req;
        const supplierPaid: boolean = req.body?.supplierPaid;
        const sellerPaid: boolean = req.body?.sellerPaid;
        const nowDate = new Date();

        const rewardUpdate = await Reward.update(
          {
            supplierPaid,
            sellerFeePaidAt: sellerPaid ? nowDate : null,
          },
          {
            where: { orderId: query.orderId },
            transaction,
          },
        );

        if (!rewardUpdate[0])
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Вознаграждение не найдено с id ' + query.id,
          });

        const reward = await Reward.findOne({
          where: { orderId: query.orderId },
          transaction,
        });

        const order = await Order.findByPk(query.orderId as string, {
          attributes: ['id', 'sellerId', 'orderRequestId'],
          transaction,
        });
        const user = await User.findByPk(order.sellerId, {
          attributes: ['id', 'salesNumber'],
          transaction,
        });
        const orderRequest = await OrderRequest.findByPk(order.orderRequestId, {
          include: [{ model: Order, as: 'orders' }],
          transaction,
        });

        //Notifications block start
        if (!!reward.givenAt) {
          await orderRequest.update(
            {
              managerLastNotificationCreatedAt: new Date(),
            },
            {
              transaction,
            },
          );

          await createOrderNotificationService({
            userId: order.sellerId,
            role: 'seller',
            type: ENotificationType.rewardPaid,
            autoread: false,
            orderRequest: orderRequest,
            order: order,
            io: this.io,
            transaction,
          });
        }
        //Notifications block end

        if (reward.supplierPaid && !!reward.givenAt) {
          await user.update(
            {
              salesNumber: (user.salesNumber || 0) + 1,
            },
            {
              where: {
                id: order.sellerId,
              },
              transaction,
            },
          );
          await order.update(
            {
              completionDate: nowDate,
            },
            {
              transaction,
            },
          );

          if (orderRequest.orders.filter(({ completionDate }) => !completionDate).length === 0) {
            await orderRequest.update(
              {
                completionDate: nowDate,
              },
              { transaction },
            );
          }
        }

        await updateOrderRequestUserStatusService({
          orderRequestId: orderRequest.id,
          sellerIds: [order.sellerId],
          transaction,
        });

        return APIResponse({
          res,
          data: reward,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Вознаграждение не обновленно',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Generate month reward list pdf
   * @route     GET /order/reward/list/month
   * @params    ? givenAtMonth
   * @success 	Buffer
   * @access    Private: rewardsAvailable
   */
  getMonthRewardList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const isAdmin = ['operator', 'manager'].includes(authUserRole.role.label);
      let sellerId: User['id'] = isAdmin ? (req?.query?.sellerId as string) : authUser.id;
      const givenAtPeriod = req.query.givenAtMonth as string;
      const { title, file } = await getMonthRewardListService({ givenAtPeriod, sellerId, req, res });

      return APIResponse({
        res,
        data: {
          title,
          file: file.toString('base64'),
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список вознаграждений за месяц не был сгенерирован',
        error: err,
      });
    }
  };

  generateAcceptanceAct = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const { orderRequestId } = req.query;

      const order = await Order.findOne({
        where: {
          sellerId: authUser.id,
          orderRequestId,
        },
        include: [
          {
            model: RequestProduct,
            as: 'products',
            include: [{ model: Product, as: 'product' }],
          },
          {
            model: Organization,
            as: 'organization',
            include: [{ model: Address, as: 'juristicAddress' }],
          },
        ],
      });
      const orderRequest = await OrderRequest.findByPk(order.orderRequestId, {
        include: [
          {
            model: User,
            as: 'customer',
          },
        ],
      });

      function getNumberFloatPart(num: number): string {
        const str = num.toFixed(2).toString();
        const arr = str.split('.');
        return padZero(Number(arr[1]));
      }

      const organization = order.organization;
      const sum = order.totalPrice;
      const sumInt = Math.floor(sum);
      const data = {
        orderNumber: orderRequest.idOrder,
        sellerOrg: {
          name: getOrgName(organization, true, true),
          email: organization.email,
          phone: organization.phone,
          inn: order.organization.inn,
          kpp: organization.kpp,
          ogrnForm: organization.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
          ogrn: organization.ogrn,
          address: convertAddressToString(organization.juristicAddress),
        },
        customer: {
          name: getUserName(orderRequest.customer, 'full'),
        },
        products: order.products.map((product, i) => ({
          number: i + 1,
          name: product?.altName || product.product.name_ru,
          article: product?.altArticle || product.product.article,
          count: product.count || 1,
          uniPrice: separateNumberBy(product.unitPrice.toFixed(2), ' ').replace('.', ','),
          cost: separateNumberBy(((product.count || 1) * product.unitPrice).toFixed(2), ' ').replace('.', ','),
        })),
        totals: {
          sum: separateNumberBy(sum.toFixed(2), ' ').replace('.', ','),
          sumInt,
          sumFloat: getNumberFloatPart(sum),
          sumText: numberToWordsRu.convert(sum),
        },
      };

      const pdf = await generatePdfFromTemplate({
        data,
        pathToTemplate: `templates/acceptanceAct.html`,
      });

      return APIResponse({
        res,
        data: {
          title: 'АКТ приема-передачи',
          file: pdf.toString('base64'),
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось составить акт приема-передачи',
        error: err,
      });
    }
  };

  getOrderRequestListDocExcel = async (req: Request, res: Response) => {
    try {
      const authUserRole: UserRoles = req.body.authUserRole;
      const orderRequestIds = req.query?.orderRequestIds as string[];
      const page = Number(req?.query?.page || 1);

      async function getOrderRequestList() {
        if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
          const {
            data: { rows: orderRequests },
          } = await getOrderRequestListAsManager_service({ req, ids: orderRequestIds });
          return orderRequests;
        }
        if (authUserRole.role.label === 'seller') {
          const {
            data: { rows: orderRequests },
          } = await getOrderRequestListAsSeller_service({ req, ids: orderRequestIds });
          return orderRequests;
        }
        if (authUserRole.role.label === 'customer') {
          const {
            data: { rows: orderRequests },
          } = await getOrderRequestListAsCustomer_service({ req, ids: orderRequestIds });
          return orderRequests;
        }
      }
      const orderRequests = await getOrderRequestList();

      const filename = `Запросы - страница ${page}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Запросы');

      worksheet.columns = [
        {
          key: 'idOrder',
          header: '№',
          width: 10,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'createdAt',
          header: 'Дата запроса',
          width: 15,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'quantity',
          header: 'Кол-во товаров',
          width: 14,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'status',
          header: 'Статус',
          width: 23,
          style: EXCEL_COL_STYLE,
        },
        ['customer', 'manager', 'operator'].includes(authUserRole.role.label) && {
          key: 'deliveryAddress',
          header: 'Пункт доставки',
          width: 50,
          style: EXCEL_COL_STYLE,
        },
        ['customer', 'manager', 'operator'].includes(authUserRole.role.label) && {
          key: 'offersCount',
          header: 'Кол-во предложений',
          width: 13,
          style: EXCEL_COL_STYLE,
        },
        ['seller'].includes(authUserRole.role.label) && {
          key: 'customerName',
          header: 'ФИО покупателя',
          width: 30,
          style: EXCEL_COL_STYLE,
        },
      ].filter(Boolean);

      for (let i = 0; i < orderRequests.length; i++) {
        const orderRequest = orderRequests[i];
        worksheet.addRow({
          idOrder: `${orderRequest.idOrder}`,
          createdAt: formatDate(new Date(orderRequest.createdAt), 'dd.MM.yyyy'),
          quantity: orderRequest.products.map(({ quantity }) => quantity).reduce((a, b) => a + b, 0) || '-',
          status: ORDER_REQUEST_STATUSES[orderRequest.status],
          deliveryAddress: convertAddressToString(orderRequest.address),
          offersCount: orderRequest.orders.length,
          customerName: getUserName(orderRequest?.customer, 'full'),
        });
        if (orderRequest.status === 'APPROVED') {
          worksheet.lastRow.getCell('status').font = {
            color: {
              argb: PRIMARY_COLOR,
            },
          };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();

      return APIResponse({
        res,
        data: {
          filename,
          buffer,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось составить таблицу запросов',
        error: err,
      });
    }
  };

  getOrderListDocExcel = async (req: Request, res: Response) => {
    try {
      const authUserRole: UserRoles = req.body.authUserRole;
      const orderIds = req.query?.orderIds as string[];
      const page = Number(req?.query?.page || 1);
      const isHistory = (req?.query?.isHistory as string) === '1';

      async function getOrderList() {
        if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
          const {
            data: { rows: orders },
          } = await getOrderListAsManagerService({ req, ids: orderIds, isHistory });
          return orders;
        }
        if (authUserRole.role.label === 'seller') {
          const {
            data: { rows: orders },
          } = await getOrderListAsSellerService({ req, ids: orderIds, isHistory });
          return orders;
        }
        if (authUserRole.role.label === 'customer') {
          const {
            data: { rows: orders },
          } = await getOrderListAsCustomerService({ req, ids: orderIds, isHistory });
          return orders;
        }
      }

      const orders = await getOrderList();

      const filename = `${!isHistory ? 'Заказы' : 'История заказов'} - страница ${page}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${!isHistory ? 'Заказы' : 'История заказов'}`);

      if (['customer', 'seller'].includes(authUserRole.role.label)) {
        worksheet.columns = [
          {
            key: 'idOrder',
            header: '№',
            width: 10,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'date',
            header: !isHistory ? 'Дата оплаты' : 'Дата завершения',
            width: 15,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'quantity',
            header: 'Кол-во товаров',
            width: 14,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'status',
            header: 'Статус',
            width: 24,
            style: EXCEL_COL_STYLE,
          },
          ['customer'].includes(authUserRole.role.label) && {
            key: 'deliveryAddress',
            header: 'Пункт доставки',
            width: 50,
            style: EXCEL_COL_STYLE,
          },
          ['seller'].includes(authUserRole.role.label) && {
            key: 'customerName',
            header: 'ФИО покупателя',
            width: 30,
            style: EXCEL_COL_STYLE,
          },
          ['seller'].includes(authUserRole.role.label) && {
            key: 'cash',
            header: 'CASH',
            width: 13,
            style: EXCEL_COL_STYLE,
          },
        ].filter(Boolean);

        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          worksheet.addRow({
            idOrder: `${order.idOrder}`,
            date: !isHistory
              ? order.paymentDate
                ? formatDate(new Date(order.paymentDate), 'dd.MM.yyyy')
                : '-'
              : order.completionDate
              ? formatDate(new Date(order.completionDate), 'dd.MM.yyyy')
              : '-',
            quantity: order.orders
              .filter(({ status }) => status === 'PAID')
              .map(({ products }) => products.map(({ count }) => count))
              .flat()
              .reduce((a, b) => a + b, 0),
            status: ORDER_REQUEST_STATUSES[order.status],
            deliveryAddress: convertAddressToString(order.address),
            customerName: getUserName(order?.customer, 'full'),
            cash: !!order?.orders?.[0]?.reward
              ? `${order?.orders?.[0]?.reward?.amount} ₽`
              : `${gaussRound(
                  calculateOrderCash(
                    order?.orders?.[0]?.totalPrice,
                    order?.orders?.[0]?.organization?.priceBenefitPercent,
                    true,
                  ),
                  2,
                )} ₽`,
          });
          if (order.status === 'APPROVED') {
            worksheet.lastRow.getCell('status').font = {
              color: {
                argb: PRIMARY_COLOR,
              },
            };
          }
          if ((order.status as any) !== 'REWARD_PAID' && ['seller'].includes(authUserRole.role.label)) {
            worksheet.lastRow.getCell('cash').font = {
              color: {
                argb: PRIMARY_COLOR,
              },
            };
          }
        }
      }

      if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
        worksheet.columns = [
          {
            key: 'idOrder',
            header: '№',
            width: 15,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'date',
            header: !isHistory ? 'Дата оплаты' : 'Дата завершения',
            width: 15,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'quantity',
            header: 'Кол-во товаров',
            width: 14,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'statusCustomer',
            header: 'Статус\nпокупателя',
            width: 24,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'statusSeller',
            header: 'Статус\nпродавца',
            width: 24,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'deliveryAddress',
            header: 'Пункт доставки',
            width: 50,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'reward',
            header: 'Вознаграждение',
            width: 17,
            style: EXCEL_COL_STYLE,
          },
          {
            key: 'payment',
            header: 'Оплачено',
            width: 20,
            style: EXCEL_COL_STYLE,
          },
        ].filter(Boolean);

        for (let i = 0; i < orders.length; i++) {
          const order = orders[i];
          worksheet.addRow({
            idOrder: `${order.idOrder}`,
            date: !isHistory
              ? order.paymentDate
                ? formatDate(new Date(order.paymentDate), 'dd.MM.yyyy')
                : '-'
              : order.completionDate
              ? formatDate(new Date(order.completionDate), 'dd.MM.yyyy')
              : '-',
            quantity: order.orders
              .filter(({ status }) => status === 'PAID')
              .map(({ products }) => products.map(({ count }) => count))
              .flat()
              .reduce((a, b) => a + b, 0),
            statusCustomer: ORDER_REQUEST_STATUSES[order.status],
            statusSeller: '-',
            deliveryAddress: convertAddressToString(order.address),
            reward:
              order.orders.length > 0
                ? separateNumberBy(
                    gaussRound(
                      order.orders.map(({ reward }) => reward?.amount).reduce((a, b) => a + b, 0),
                      2,
                    ),
                    ' ',
                  ) + ' ₽'
                : '-',
            payment: `Поставщику - ${
              order.orders.filter(({ reward }) => !!reward?.supplierPaid).length === order.orders.length ? 'да' : 'нет'
            }\nПродавцу и ФНС - ${
              order.orders.filter(({ reward }) => !!reward?.givenAt).length === order.orders.length ? 'да' : 'нет'
            }`,
          });
          if (order.status === 'APPROVED') {
            worksheet.lastRow.getCell('statusCustomer').font = {
              color: {
                argb: PRIMARY_COLOR,
              },
            };
          }

          for (let i = 0; i < order.orders.length; i++) {
            const offer = order.orders[i];
            worksheet.addRow({
              idOrder: getUserName(offer.seller, 'full'),
              date: !isHistory
                ? order.paymentDate
                  ? formatDate(new Date(order.paymentDate), 'dd.MM.yyyy')
                  : '-'
                : offer.completionDate
                ? formatDate(new Date(offer.completionDate), 'dd.MM.yyyy')
                : '-',
              quantity: offer.products
                .map(({ count }) => count)
                .flat()
                .reduce((a, b) => a + b, 0),
              statusCustomer: ORDER_REQUEST_STATUSES[offer.status],
              statusSeller: ORDER_REQUEST_STATUSES[order.status],
              deliveryAddress: convertAddressToString(order.address),
              reward: separateNumberBy(gaussRound(offer.reward.amount, 2), ' ') + ' ₽',
              payment: `Поставщику - ${!!offer.reward.supplierPaid ? 'да' : 'нет'}\nПродавцу и ФНС - ${
                !!offer.reward.givenAt ? 'да' : 'нет'
              }`,
            });
            if (order.status === 'APPROVED') {
              worksheet.lastRow.getCell('statusCustomer').font = {
                color: {
                  argb: PRIMARY_COLOR,
                },
              };
              worksheet.lastRow.getCell('statusSeller').font = {
                color: {
                  argb: PRIMARY_COLOR,
                },
              };
            }
          }

          worksheet.addRow({
            idOrder: null,
            date: null,
            quantity: null,
            statusCustomer: null,
            statusSeller: null,
            deliveryAddress: null,
            reward: null,
            payment: null,
          });
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();

      return APIResponse({
        res,
        data: {
          filename,
          buffer,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось составить таблицу заказов',
        error: err,
      });
    }
  };

  getRefundExchangeListDocExcel = async (req: Request, res: Response) => {
    try {
      const authUserRole: UserRoles = req.body.authUserRole;
      const orderIds = req.query?.orderIds as string[];
      const page = Number(req?.query?.page || 1);

      async function getOrderList() {
        if (['manager', 'operator'].includes(authUserRole?.role?.label)) {
          const {
            data: { rows: orders },
          } = await getRefundExchangeListAsManagerService({ req, ids: orderIds });
          return orders;
        }
        if (authUserRole.role.label === 'seller') {
          const {
            data: { rows: orders },
          } = await getRefundExchangeListAsSellerService({ req, ids: orderIds });
          return orders;
        }
        if (authUserRole.role.label === 'customer') {
          const {
            data: { rows: orders },
          } = await getRefundExchangeListAsCustomerService({ req, ids: orderIds });
          return orders;
        }
      }

      const orders = await getOrderList();

      console.log('ORDERS', orders);

      const filename = `Возврат-обмен - страница ${page}.xlsx`;

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Возврат-обмен`);

      worksheet.columns = [
        {
          key: 'idOrder',
          header: '№',
          width: 10,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'status',
          header: 'Статус',
          width: 24,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'quantity',
          header: 'Кол-во товаров',
          width: 14,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'totalPrice',
          header: 'Сумма заказа',
          width: 15,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'refundProductsQuantity',
          header: 'Кол-во товаров к возврату',
          width: 15,
          style: EXCEL_COL_STYLE,
        },
        {
          key: 'refundProductsPrice',
          header: 'Сумма товаров к возврату',
          width: 15,
          style: EXCEL_COL_STYLE,
        },
      ].filter(Boolean);

      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        worksheet.addRow({
          idOrder: `${order.idOrder}`,
          status: ORDER_REQUEST_STATUSES[order.status],
          quantity: order.orders
            .flatMap(({ products }) => products.map(({ count }) => count))
            .reduce((a, b) => a + b, 0),
          totalPrice: gaussRound(order.totalPrice, 2),
          refundProductsQuantity: order.orders
            .flatMap(({ products }) =>
              products.map(({ refundExchangeRequest }) => refundExchangeRequest?.quantity || 0),
            )
            .reduce((a, b) => a + b, 0),
          refundProductsPrice: gaussRound(
            order.orders
              .flatMap(({ products }) =>
                products.map(product => (product.refundExchangeRequest?.quantity || 0) * product.unitPrice),
              )
              .reduce((a, b) => a + b, 0),
            2,
          ),
        });
        if (order.status === 'APPROVED') {
          worksheet.lastRow.getCell('status').font = {
            color: {
              argb: PRIMARY_COLOR,
            },
          };
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();

      return APIResponse({
        res,
        data: {
          filename,
          buffer,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось составить таблицу возвратов/обменов',
        error: err,
      });
    }
  };

  getOrderRequestDoc = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const docType = req?.query?.docType as 'xlsx' | 'pdf';
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;

      const { orderRequest } =
        authUserRole.role.label === 'seller'
          ? await getOrderRequestAsSellerService({ id, req, res })
          : await getOrderRequestService({ id, req, res });

      const selectedRegions: SelectedRegions[] = await SelectedRegions.findAll({
        include: [
          {
            model: Region,
            attributes: [[seq.literal('fias_id'), 'id']],
          },
        ],
        where: {
          orderRequestId: id,
        },

        attributes: ['fiasId'],
      });

      const customer = await User.findByPk(orderRequest.customerId);

      const sellerIds: string[] = (orderRequest?.selectedSellerIds || '').split(' ');
      const selectedSellers: User[] = !!sellerIds?.length
        ? await User.findAll({
            where: {
              id: sellerIds,
            },
          })
        : [];

      const productsWithIds = orderRequest.products.filter(({ productId }) => productId);
      const describedProducts = orderRequest.products.filter(({ describedProduct }) => describedProduct);

      let data: IOrderRequestDocData = {
        defaultCssStyle: DEFAULT_PDF_TEMPLATE_STYLE,
        idOrder: orderRequest.idOrder,
        date: formatDate(new Date(orderRequest.createdAt), 'dd.MM.yyyy HH:mm'),
        customerName: authUserRole.role.label !== 'customer' ? getUserName(customer, 'full') : null,
        deliveryAddress: convertAddressToString(orderRequest.address),
        comment: !!orderRequest?.comment ? htmlToText(orderRequest.comment) : null,
        paidSum: null,
      };

      const describedProduct = describedProducts?.[0];
      if (!!describedProduct) {
        const product: any = describedProduct;
        data.describedProduct = {
          categories:
            product?.describedProduct?.autoBrandsData
              ?.map((item: any) => `${item?.autoBrand?.name} (${item?.autoType?.name})`)
              .join(' / ') ||
            product?.describedProduct?.autoBrand?.name ||
            product?.describedProduct?.productGroups?.map(item => item?.name).join(' / ') ||
            product?.describedProduct?.productGroup?.name,
          quantity: product?.quantity || '-',
          description: htmlToText(product?.describedProduct?.description),
        };

        if (authUserRole.role.label !== 'seller') {
          data.sellerRegion = !!selectedRegions.length ? selectedRegions.length.toString() : 'Все регионы';
          if (!!selectedSellers?.length) {
            data.selectedSellers = selectedSellers.map(seller => getUserName(seller, 'full')).join(', ');
          }
        }
      }

      const offer =
        authUserRole.role.label === 'seller' && orderRequest?.orders?.find(el => el.sellerId === authUser.id);

      if (!offer) {
        if (!!productsWithIds?.length) {
          data.displayProducts = true;

          data.products = productsWithIds.map((product: any, i) => ({
            index: i + 1,
            name: product.product.name,
            manufacturer: product.product?.manufacturer || '-',
            article: product.product.article,
            requestedQuantity: product.quantity,
          }));
        }
      } else {
        data.displayProducts = true;
        data.offerSent = true;

        const selectedOrganization = await Organization.findByPk(offer.organizationId);

        const getRequestProducts = () =>
          orderRequest.products.map(product => {
            const offeredProduct = !!offer && offer.products.find(({ productId }) => productId === product.productId);

            if (!!offeredProduct) {
              return {
                ...product,
                count: offeredProduct?.quantity || 0,
                unitPrice: offeredProduct?.unitPrice || 0,
                deliveryQuantity: offeredProduct?.deliveryQuantity || 0,
                deliveryTerm: offeredProduct?.deliveryTerm || 0,
                altName: offeredProduct?.altName,
                altManufacturer: offeredProduct?.altManufacturer,
                altArticle: offeredProduct?.altArticle,
              };
            }
            return product;
          });
        const productList = getRequestProducts();

        const calculateProductSum = (product: IRequestProduct) => {
          const minQuantity =
            product?.quantity > 0
              ? Math.min(product?.quantity, product?.count + product?.deliveryQuantity)
              : product?.count + product?.deliveryQuantity;
          return minQuantity && product?.unitPrice ? minQuantity * product.unitPrice : 0;
        };
        const calculateTotal = () =>
          productList
            .map(product => calculateProductSum(product))
            .filter(Boolean)
            .reduce((a, b) => a + b, 0);
        const calculateTotalCash = () =>
          productList
            .map(
              product =>
                calculateOrderCash(calculateProductSum(product), selectedOrganization?.priceBenefitPercent, true) || 0,
            )
            .filter(Boolean)
            .reduce((a, b) => a + b, 0);

        data.products = productList.map((product: any, i) => ({
          index: i + 1,
          article: product?.altArticle || product.product.article,
          name: product?.altName || product.product.name,
          manufacturer: product?.altManufacturer || product.product.manufacturer || '-',
          requestedQuantity: product?.quantity,
          unitPrice: product.unitPrice,
          offeredQuantity: product.count || '-',
          deliveryQuantity: product.deliveryQuantity,
          deliveryTerm: product.deliveryTerm,
          totalPrice: gaussRound(calculateProductSum(product), 2),
          cash: gaussRound(
            calculateOrderCash(calculateProductSum(product), selectedOrganization?.priceBenefitPercent, true) || 0,
            2,
          ),
        }));
        data.total = {
          requestedQuantity: productList.map(({ quantity }) => quantity).reduce((a, b) => a + b, 0),
          offeredQuantity: productList
            .map(product => product.count)
            .filter(Boolean)
            .reduce((a, b) => a + b, 0),
          price: gaussRound(calculateTotal(), 2),
          cash: gaussRound(calculateTotalCash(), 2),
          comission: gaussRound((calculateTotal() / 100) * selectedOrganization?.priceBenefitPercent || 0, 2),
          earn: 0,
        };
        data.total.earn = gaussRound(data.total.price - data.total.comission, 2);
        data.paidSum = offer?.paidSum;
      }

      if (docType === 'pdf') {
        const { buffer, filename } = await getOrderRequestDocPdfService({
          res,
          authUserRole,
          data,
        });
        return APIResponse({
          res,
          data: {
            buffer,
            filename,
          },
        });
      }
      if (docType === 'xlsx') {
        const { buffer, filename } = await getOrderRequestDocExcelService({
          res,
          authUserRole,
          data,
        });
        return APIResponse({
          res,
          data: {
            buffer,
            filename,
          },
        });
      }

      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Не указан тип документа',
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось составить таблицу запроса',
        error: err,
      });
    }
  };

  getOrderRequestOffersDocExcel = createAPIMethod(
    { errorMessage: 'Не удалось составить таблицу предложений', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { id } = req.params;
      const mode = req?.query?.mode as 'extended' | 'list';
      const docType = req?.query?.docType as 'xlsx' | 'pdf';

      const resData = await ordersService.getOffersDoc({ orderId: id, mode, docType, authUser, authUserRole });

      return resData;
    },
  );

  getOrderDocExcel = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const docType = req?.query?.docType as 'xlsx' | 'pdf';
      const offerId = req?.query?.offerId as string;
      const sellerNumber = Number(req?.query?.sellerNumber);
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;

      const { orderRequest: order } =
        authUserRole.role.label === 'seller'
          ? await getOrderRequestAsSellerService({ id, req, res })
          : await getOrderRequestService({ id, req, res });
      const customer = await User.findByPk(order.customerId);

      console.log('DOC TYPE', docType);

      if (docType === 'xlsx') {
        const filename = `Заказ ${order.idOrder}.xlsx`;
        const wb = new ExcelJS.Workbook();

        if (authUserRole.role.label !== 'seller') {
          let ws = wb.addWorksheet(`Весь заказ`);
          ws.addRow([`Номер заказа: ${order.idOrder}`]);
          if (authUserRole.role.label !== 'customer') {
            ws.addRow([`Покупатель: ${getUserName(customer, 'full')}`]);
            ws.addRow([`Плательщик: ${!!order?.payerId ? order?.payer?.name : getUserName(order.customer)}`]);
          }
          ws.addRow([`Дата заказа: ${formatDate(new Date(order.paymentDate), 'dd.MM.yyyy HH:mm')}`]);
          ws.addRow([`Адрес доставки: ${convertAddressToString(order.address)}`]);

          const totalProductList: any[] = [];
          for (let i = 0; i < order.orders.length; i++) {
            const offer: any = order.orders[i];
            if (offer.status !== 'PAID') continue;
            for (const offeredProduct of offer.products) {
              let index = totalProductList.findIndex(({ productId }) => productId === offeredProduct.productId);
              if (index === -1) {
                index = totalProductList.length;
                totalProductList[index] = {
                  ...offeredProduct,
                  product: offeredProduct.product,
                  count: 0,
                  totalPrice: 0,
                };
              }

              totalProductList[index].count += offeredProduct.count;
              totalProductList[index].totalPrice += offeredProduct.count * offeredProduct.unitPrice;
            }
          }

          ws.addRow([]);
          const colsWidth = [10, 24, 14, 14, 8, 10];
          ws.addRow(['№', 'Наименование', 'Бренд', 'Артикул', 'Кол-во', 'Сумма, ₽']);

          ws.lastRow.eachCell((cell, colNumber) => {
            cell.style = EXCEL_COL_STYLE;
            ws.getColumn(colNumber).width = colsWidth[colNumber - 1];
          });

          for (let i = 0; i < totalProductList.length; i++) {
            const product: any = totalProductList[i];
            ws.addRow([
              i + 1,
              product.product.name,
              product.product?.manufacturer || '-',
              product.product.article,
              product.count,
              gaussRound(product.totalPrice, 2),
            ]);
            ws.lastRow.eachCell(cell => {
              cell.style = EXCEL_COL_STYLE;
            });
          }

          ws.addRow([
            '',
            '',
            '',
            'Итого',
            totalProductList.map(({ count }) => count).reduce((a, b) => a + b, 0),
            gaussRound(
              totalProductList.map(({ totalPrice }) => totalPrice).reduce((a, b) => a + b, 0),
              2,
            ),
          ]);
          ws.lastRow.eachCell(cell => {
            cell.style = EXCEL_COL_STYLE;
          });

          for (let offerIndex = 0; offerIndex < order.orders.length; offerIndex++) {
            const offer = order.orders[offerIndex];
            ws = wb.addWorksheet(`Продавец ${offerIndex + 1}`);

            ws.addRow([`Номер заказа: ${order.idOrder}`]);
            ws.addRow([`Дата заказа: ${formatDate(new Date(order.paymentDate), 'dd.MM.yyyy HH:mm')}`]);
            if (authUserRole.role.label !== 'customer') {
              ws.addRow([`Покупатель: ${getUserName(customer, 'full')}`]);
              ws.addRow([`Плательщик: ${!!order?.payerId ? order?.payer?.name : getUserName(order.customer)}`]);
            }
            ws.addRow([
              `Продавец: ${getUserName(offer.seller)}. Рейтинг: ${gaussRound(
                offer.seller.ratingValue || 0,
                1,
              )}, отзывы: ${offer.seller.reviews.length}, продаж: ${offer.seller.salesNumber || 0}`,
            ]);
            ws.addRow([`Адрес доставки: ${convertAddressToString(order.address)}`]);
            ws.addRow([
              `Условие доставки: ${
                offer?.changedTransportCompany
                  ? 'ожидается изменение на' +
                    ' ' +
                    (offer?.notConfirmedTransportCompany ? offer?.notConfirmedTransportCompany?.name : 'самовывоз')
                  : offer?.transportCompany
                  ? offer?.transportCompany?.name
                  : 'самовывоз'
              }`,
            ]);
            if (!!offer?.transportCompany) {
              ws.addRow([`Трек номер: ${offer?.trackNumber || '-'}`]);
              ws.addRow([
                `Заказ отгружен: ${
                  !!offer?.departureDate ? formatDate(new Date(offer.departureDate), 'dd.MM.yyyy') : '-'
                }`,
              ]);
              ws.addRow([
                `Заказ получен: ${
                  offer?.status === 'PAID' && !!offer?.receivingDate
                    ? formatDate(new Date(offer.receivingDate), 'dd.MM.yyyy')
                    : '-'
                }`,
              ]);
            }
            ws.addRow([`Цены указаны: ${offer.organization.hasNds ? 'с НДС' : 'без НДС'}`]);
            ws.addRow([`${offer.organization.name}`]);
            ws.addRow([]);

            const colsWidth = [10, 24, 14, 14, 8, 10, 10, 12, 12, 12, 10];
            ws.addRow([
              '№',
              'Наименование',
              'Бренд',
              'Артикул',
              'Кол-во',
              'Цена за ед, ₽',
              'Кол-во в наличии',
              'Под заказ',
              '',
              'Сумма, ₽',
              'Возврат/\nобмен',
            ]);
            const uniteCells = ['H', 'I'];
            ws.mergeCells(`${uniteCells[0]}${ws.rowCount}:${uniteCells[1]}${ws.rowCount}`);
            ws.addRow(['', '', '', '', '', '', '', 'кол-во', 'поступление*', '', '']);
            const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
            for (const letter of letters) {
              if (uniteCells.includes(letter)) continue;
              ws.mergeCells(`${letter}${ws.rowCount - 1}:${letter}${ws.rowCount}`);
            }

            for (const rowNumber of [ws.rowCount - 1, ws.rowCount]) {
              let i = 0;
              ws.getRow(rowNumber).eachCell((cell, colNumber) => {
                cell.style = EXCEL_COL_STYLE;
                ws.getColumn(colNumber).width = colsWidth[colNumber - 1];
                i++;
              });
            }

            for (let i = 0; i < offer.products.length; i++) {
              const product: any = offer.products[i];
              ws.addRow([
                i + 1,
                product?.altName || product.product.name,
                product?.altManufacturer || product?.product?.manufacturer || '-',
                product?.altArticle || product?.product?.article || '-',
                product.count,
                gaussRound(product.unitPrice, 2),
                product.quantity || '-',
                product.deliveryQuantity || '-',
                !!product.deliveryTerm
                  ? formatDate(addDays(new Date(order.paymentDate), product.deliveryTerm), 'dd.MM.yyyy')
                  : '-',
                gaussRound(product.count * product.unitPrice, 2),
                offer?.status === 'PAID' &&
                !!offer?.receivingDate &&
                differenceInDays(new Date(), new Date(offer?.receivingDate)) >= 0 &&
                differenceInDays(new Date(), new Date(offer?.receivingDate)) < 7
                  ? !!product.refundExchangeRequest
                    ? REFUND_EXCHANGE_STATUSES?.[
                        product.refundExchangeRequest.status === 'AGREED'
                          ? product.refundExchangeRequest?.disputeResolution
                          : product.refundExchangeRequest.status
                      ]
                    : '-'
                  : '-',
              ]);
              ws.lastRow.eachCell(cell => {
                cell.style = EXCEL_COL_STYLE;
              });
            }

            ws.addRow([
              '',
              '',
              '',
              'Итого',
              offer.products
                // .filter(({ isSelected }) => isSelected)
                .map(({ count }) => count)
                .reduce((a, b) => a + b, 0),
              '',
              '',
              '',
              '',
              gaussRound(
                offer.products
                  // .filter(({ isSelected }) => isSelected)
                  .map(product => product.count * product.unitPrice)
                  .filter(Boolean)
                  .reduce((a, b) => a + b, 0),
                2,
              ),
              '',
            ]);
            ws.lastRow.eachCell(cell => {
              cell.style = EXCEL_COL_STYLE;
            });
          }
        } else {
          const offer = order.orders.find(({ seller }) => authUser.id == seller.id);

          let ws = wb.addWorksheet(`Заказ ${order.idOrder}`);
          ws.addRow([`Номер заказа: ${order.idOrder}`]);
          ws.addRow([`Дата заказа: ${formatDate(new Date(order.paymentDate), 'dd.MM.yyyy HH:mm')}`]);
          ws.addRow([`Покупатель: ${getUserName(customer, 'full')}`]);
          ws.addRow([`Плательщик: ${!!order?.payerId ? order?.payer?.name : getUserName(order.customer)}`]);
          ws.addRow([`Адрес доставки: ${convertAddressToString(order.address)}`]);
          ws.addRow([
            `Условие доставки: ${
              offer?.changedTransportCompany
                ? 'ожидается изменение на' +
                  ' ' +
                  (offer?.notConfirmedTransportCompany ? offer?.notConfirmedTransportCompany?.name : 'самовывоз')
                : offer?.transportCompany
                ? offer?.transportCompany?.name
                : 'самовывоз'
            }`,
          ]);
          if (!!offer?.transportCompany) {
            ws.addRow([`Трек номер: ${offer?.trackNumber || '-'}`]);
            ws.addRow([
              `Заказ отгружен: ${
                !!offer?.departureDate ? formatDate(new Date(offer.departureDate), 'dd.MM.yyyy') : '-'
              }`,
            ]);
            ws.addRow([
              `Заказ получен: ${
                offer?.status === 'PAID' && !!offer?.receivingDate
                  ? formatDate(new Date(offer.receivingDate), 'dd.MM.yyyy')
                  : '-'
              }`,
            ]);
          }
          ws.addRow([`Цены указаны: ${offer.organization.hasNds ? 'с НДС' : 'без НДС'}`]);
          ws.addRow([`Комиссия: ${offer.organization.priceBenefitPercent}%`]);
          ws.addRow([
            `CASH: ${gaussRound(
              calculateOrderCash(
                offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0),
                offer?.organization?.priceBenefitPercent,
                true,
              ),
              2,
            )}`,
          ]);
          ws.addRow([`${offer.organization.name}`]);
          ws.addRow([]);

          const colsWidth = [10, 24, 14, 14, 8, 10, 10, 12, 12, 12];
          ws.addRow([
            '№',
            'Наименование',
            'Бренд',
            'Артикул',
            'Кол-во',
            'Цена за ед, ₽',
            'Кол-во в наличии',
            'Под заказ',
            '',
            'Сумма, ₽',
            'Возврат/\nобмен',
          ]);
          const uniteCells = ['H', 'I'];
          ws.mergeCells(`${uniteCells[0]}${ws.rowCount}:${uniteCells[1]}${ws.rowCount}`);
          ws.addRow(['', '', '', '', '', '', '', 'кол-во', 'поступление*', '']);
          const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
          for (const letter of letters) {
            if (uniteCells.includes(letter)) continue;
            ws.mergeCells(`${letter}${ws.rowCount - 1}:${letter}${ws.rowCount}`);
          }

          for (const rowNumber of [ws.rowCount - 1, ws.rowCount]) {
            ws.getRow(rowNumber).eachCell((cell, colNumber) => {
              cell.style = EXCEL_COL_STYLE;
              ws.getColumn(colNumber).width = colsWidth[colNumber - 1];
            });
          }

          for (let i = 0; i < offer.products.length; i++) {
            const product: any = offer.products[i];
            ws.addRow([
              i + 1,
              product?.altName || product.product.name,
              product?.altManufacturer || product?.product?.manufacturer || '-',
              product?.altArticle || product?.product?.article || '-',
              product.count,
              gaussRound(product.unitPrice, 2),
              product.quantity || '-',
              product.deliveryQuantity || '-',
              !!product.deliveryTerm
                ? formatDate(addDays(new Date(order.paymentDate), product.deliveryTerm), 'dd.MM.yyyy')
                : '-',
              gaussRound(product.count * product.unitPrice, 2),
              offer?.status === 'PAID' &&
              !!offer?.receivingDate &&
              differenceInDays(new Date(), new Date(offer?.receivingDate)) >= 0 &&
              differenceInDays(new Date(), new Date(offer?.receivingDate)) < 7
                ? !!product.refundExchangeRequest
                  ? REFUND_EXCHANGE_STATUSES?.[
                      product.refundExchangeRequest.status === 'AGREED'
                        ? product.refundExchangeRequest?.disputeResolution
                        : product.refundExchangeRequest.status
                    ]
                  : '-'
                : '-',
            ]);
            ws.lastRow.eachCell(cell => {
              cell.style = EXCEL_COL_STYLE;
            });
          }

          ws.addRow([
            '',
            '',
            '',
            'Итого',
            offer.products.map(({ count }) => count).reduce((a, b) => a + b, 0),
            '',
            '',
            '',
            '',
            gaussRound(
              offer.products
                .map(product => product.count * product.unitPrice)
                .filter(Boolean)
                .reduce((a, b) => a + b, 0),
              2,
            ),
            '',
          ]);
          ws.lastRow.eachCell(cell => {
            cell.style = EXCEL_COL_STYLE;
          });

          ws.addRow([
            '',
            '',
            '',
            'Комиссия',
            '',
            '',
            '',
            '',
            '',
            gaussRound(
              (offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) / 100) *
                offer?.organization?.priceBenefitPercent,
              2,
            ),
            '',
          ]);
          ws.lastRow.eachCell(cell => {
            cell.style = EXCEL_COL_STYLE;
          });

          ws.addRow([
            '',
            '',
            '',
            'За вычетом комиссии',
            '',
            '',
            '',
            '',
            '',
            gaussRound(
              offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) -
                (offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) / 100) *
                  offer?.organization?.priceBenefitPercent,
              2,
            ),
            '',
          ]);
          ws.lastRow.eachCell(cell => {
            cell.style = EXCEL_COL_STYLE;
          });
        }

        const buffer = await wb.xlsx.writeBuffer();

        return APIResponse({
          res,
          data: {
            filename,
            buffer,
          },
        });
      } else {
        const filename = `Заказ ${order.idOrder}.pdf`;

        if (authUserRole.role.label !== 'seller') {
          const totalProductList = [];

          if (!!offerId) {
            order.orders = order.orders.filter(offer => offer.id === offerId);
          }

          for (const offer of order.orders) {
            if (offer.status !== 'PAID') continue;
            for (const offeredProduct of offer.products) {
              let index = totalProductList.findIndex(({ productId }) => productId === offeredProduct.productId);
              if (index === -1) {
                index = totalProductList.length;
                totalProductList[index] = {
                  ...offeredProduct,
                  product: offeredProduct.product,
                  count: 0,
                  totalPrice: 0,
                };
              }

              totalProductList[index].count += offeredProduct.count;
              totalProductList[index].totalPrice += offeredProduct.count * offeredProduct.unitPrice;
            }
          }

          const data: IOrderDocData = {
            defaultCssStyle: DEFAULT_PDF_TEMPLATE_STYLE,
            idOrder: order.idOrder,
            date: formatDate(new Date(order.createdAt), 'dd.MM.yyyy HH:mm'),
            customerName: authUserRole.role.label !== 'customer' ? getUserName(customer, 'full') : null,
            deliveryAddress: convertAddressToString(order.address),
            comment: !!order?.comment ? htmlToText(order.comment) : null,
            order: {
              products: totalProductList.map((product, i) => ({
                index: i + 1,
                name: product.product.name,
                manufacturer: product.product.manufacturer || '-',
                article: product.product.article,
                quantity: product.count,
                totalPrice: gaussRound(product.totalPrice, 2),
              })),
              productsQuantity: totalProductList.map(({ count }) => count).reduce((a, b) => a + b, 0),
              totalPrice: gaussRound(
                totalProductList.map(({ totalPrice }) => totalPrice).reduce((a, b) => a + b, 0),
                2,
              ),
            },
            offers: order.orders.map((offer, offerIndex) => ({
              index: !!offerId ? sellerNumber : offerIndex + 1,
              seller: {
                name: getUserName(offer.seller, 'full'),
                rating: gaussRound(offer.seller.ratingValue || 0, 1),
                stars:
                  offer.seller.ratingValue < 1
                    ? [false, false, false, false, false]
                    : Array(false, false, false, false, false).fill(true, 0, Math.round(offer.seller.ratingValue) - 1),
                reviewsNumber: offer.seller.reviews.length,
                salesNumber: offer.seller.salesNumber || 0,
              },
              products: offer.products.map((product, productIndex) => ({
                index: productIndex + 1,
                name: product?.altName || product.product?.['name'],
                manufacturer: product?.altManufacturer || product.product.manufacturer || '-',
                article: product?.altArticle || product.product.article,
                requestedQuantity: product.count,
                unitPrice: product.unitPrice,
                offeredQuantity: product.quantity || '-',
                deliveryQuantity: product.deliveryQuantity || '-',
                deliveryTerm: !!product.deliveryTerm
                  ? formatDate(addDays(new Date(order.paymentDate), product.deliveryTerm), 'dd.MM.yyyy')
                  : '-',
                totalPrice: gaussRound(product.count * product.unitPrice, 2),
                refundStatus:
                  offer?.status === 'PAID' &&
                  !!offer?.receivingDate &&
                  differenceInDays(new Date(), new Date(offer?.receivingDate)) >= 0 &&
                  differenceInDays(new Date(), new Date(offer?.receivingDate)) < 7
                    ? !!product.refundExchangeRequest
                      ? REFUND_EXCHANGE_STATUSES?.[
                          product.refundExchangeRequest.status === 'AGREED'
                            ? product.refundExchangeRequest?.disputeResolution
                            : product.refundExchangeRequest.status
                        ]
                      : '-'
                    : '-',
              })),
              total: {
                requestedQuantity: offer.products.map(({ count }) => count).reduce((a, b) => a + b, 0),
                price: gaussRound(
                  offer.products
                    .map(product => product.count * product.unitPrice)
                    .filter(Boolean)
                    .reduce((a, b) => a + b, 0),
                  2,
                ),
                comission: gaussRound(
                  (offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) / 100) *
                    offer?.organization?.priceBenefitPercent,
                  2,
                ),
                earn: gaussRound(
                  offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) -
                    (offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) / 100) *
                      offer?.organization?.priceBenefitPercent,
                  2,
                ),
              },
              deliveryOption: offer?.transportCompany?.name || 'самовывоз',
              trackNumber: offer?.trackNumber || '-',
              departureDate: !!offer?.departureDate ? formatDate(new Date(offer.departureDate), 'dd.MM.yyyy') : '-',
              receivingDate: !!offer?.receivingDate ? formatDate(new Date(offer.receivingDate), 'dd.MM.yyyy') : '-',
              hasNds: offer.organization.hasNds,
              organizationName: offer.organization.name,
            })),
          };

          const buffer = await generatePdfFromTemplate({
            data,
            pathToTemplate: `templates/order.${!!offerId ? 'offer' : 'common'}.hbs`,
          });

          return APIResponse({
            res,
            data: {
              buffer,
              filename,
            },
          });
        } else {
          const offer = order.orders.find(el => el.sellerId === authUser.id);
          const data: IOrderDocSellerData = {
            defaultCssStyle: DEFAULT_PDF_TEMPLATE_STYLE,
            idOrder: order.idOrder,
            date: formatDate(new Date(order.createdAt), 'dd.MM.yyyy HH:mm'),
            customerName: getUserName(customer, 'full'),
            payerName: !!order?.payerId ? order?.payer?.name : getUserName(order.customer),
            deliveryAddress: convertAddressToString(order.address),
            comment: !!order?.comment ? htmlToText(order.comment) : null,
            products: offer.products.map((product, i) => ({
              index: i + 1,
              name: product?.altName || product.product?.['name'],
              manufacturer: product?.altManufacturer || product.product.manufacturer || '-',
              article: product?.altArticle || product.product.article,
              requestedQuantity: product.count,
              unitPrice: product.unitPrice,
              offeredQuantity: product.quantity || '-',
              deliveryQuantity: product.deliveryQuantity || '-',
              deliveryTerm: !!product.deliveryTerm
                ? formatDate(addDays(new Date(order.paymentDate), product.deliveryTerm), 'dd.MM.yyyy')
                : '-',
              totalPrice: gaussRound(product.count * product.unitPrice, 2),
              refundStatus:
                offer?.status === 'PAID' &&
                !!offer?.receivingDate &&
                differenceInDays(new Date(), new Date(offer?.receivingDate)) >= 0 &&
                differenceInDays(new Date(), new Date(offer?.receivingDate)) < 7
                  ? !!product.refundExchangeRequest
                    ? REFUND_EXCHANGE_STATUSES?.[
                        product.refundExchangeRequest.status === 'AGREED'
                          ? product.refundExchangeRequest?.disputeResolution
                          : product.refundExchangeRequest.status
                      ]
                    : '-'
                  : '-',
            })),
            total: {
              requestedQuantity: offer.products.map(({ count }) => count).reduce((a, b) => a + b, 0),
              price: gaussRound(
                offer.products
                  .map(product => product.count * product.unitPrice)
                  .filter(Boolean)
                  .reduce((a, b) => a + b, 0),
                2,
              ),
              comission: gaussRound(
                (offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) / 100) *
                  offer?.organization?.priceBenefitPercent,
                2,
              ),
              earn: gaussRound(
                offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) -
                  (offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0) / 100) *
                    offer?.organization?.priceBenefitPercent,
                2,
              ),
              cash: gaussRound(
                calculateOrderCash(
                  offer.products.map(({ count, unitPrice }) => count * unitPrice).reduce((a, b) => a + b, 0),
                  offer?.organization?.priceBenefitPercent,
                  true,
                ),
                2,
              ),
            },
            deliveryOption: offer?.transportCompany?.name || 'самовывоз',
            trackNumber: offer?.trackNumber || '-',
            departureDate: !!offer?.departureDate ? formatDate(new Date(offer.departureDate), 'dd.MM.yyyy') : '-',
            receivingDate: !!offer?.receivingDate ? formatDate(new Date(offer.receivingDate), 'dd.MM.yyyy') : '-',
            hasNds: offer.organization.hasNds,
            organizationName: offer.organization.name,
            organizationComission: offer.organization.priceBenefitPercent,
          };

          console.log(data);

          const buffer = await generatePdfFromTemplate({
            data,
            pathToTemplate: `templates/order.seller.hbs`,
          });

          return APIResponse({
            res,
            data: {
              buffer,
              filename,
            },
          });
        }
      }
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось составить таблицу заказа',
        error: err,
      });
    }
  };

  acceptOrderPaymentPostpone = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        if (authUserRole.role.label !== 'operator')
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Недостаточно прав',
          });

        const { orderRequest } = await acceptOrderPaymentPostponeService({
          orderRequestId: req.query.id as string,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: orderRequest,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось подтвердить отсрочку',
        });
      }
    });
  };
}

export default OrderCtrl;
