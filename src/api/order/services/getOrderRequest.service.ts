import { Request, Response } from 'express';
import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import Address from '../../address/models/Address.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import Product from '../../catalog/models/Product.model';
import { APIError } from '../../../utils/api.utils';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import AutoType from '../../catalog/models/AutoType.model';
import OrderRequest from '../models/OrderRequest.model';
import UserRoles from '../../role/models/UserRoles.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import FileModel from '../../files/models/File.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import Order from '../models/Order.model';
import Organization from '../../organization/models/Organization.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import UserReview from '../../user/models/UserReview.model';
import RequestProduct from '../models/RequestProduct.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import RefundExchangeRequestFile from '../models/RefundExchangeRequestFile.model';
import Reward from '../models/Reward.model';
import ProductFile from '../../catalog/models/ProductFile.model';
import DescribedProductFile from '../../catalog/models/DescribedProductFile.model';
import PaymentRefundRequest from '../models/PaymentRefundRequest.model';
import { ENotificationType } from '../../notification/interfaces';
import { getFilePreviewUrl, transformDescribedProduct, transformProduct } from '../../catalog/utils';
import { simplifyUser } from '../../user/utils';
import { formatOrderRequestStatus } from '../utils';
import { EMPLOYEE_ROLES } from '../../user/data';
import Notification from '../../notification/models/Notification.model';
import _ from 'lodash';
import DescribedProductAutoBrands from '../../catalog/models/DescribedProductAutoBrands.model';
import { getOrganizationComission } from '../../organization/utils';
import { ORGANIZATION_MIN_DISCOUNT_PERCENT, SERVICE_ORGANIZATION_INN } from '../../organization/data';

interface IProps {
  id: string;
  req: Request;
  res: Response;
}

interface IResult {
  orderRequest: OrderRequest;
}

export const getOrderRequestService = async ({ id, req, res }: IProps): Promise<IResult> => {
  try {
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;

    const options: seq.FindAndCountOptions = {};

    options.where = {
      [Op.or]: [{ id: id }, { idOrder: id }],
    };

    if (authUserRole.role.label !== 'manager') {
      options.where['managerDeletedAt'] = null;
    }

    options.include = [];

    options.include.push({
      model: OrderRequestFile,
      as: 'orderRequestFiles',
      required: false,
      separate: true,
      include: [{ model: FileModel, as: 'file' }],
    });

    options.include.push({
      model: User,
      as: 'customer',
    });

    options.include.push({
      model: JuristicSubject,
      as: 'payer',
      required: false,
    });

    options.include.push({
      model: Order,
      as: 'orders',
      separate: true,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Organization,
          as: 'organization',
          required: true,
          include: [{ model: Address, as: 'actualAddress' }],
        },
        {
          model: User,
          as: 'seller',
          include: [
            {
              model: TransportCompany,
              as: 'transportCompanies',
            },
            {
              model: UserReview,
              as: 'reviews',
              separate: true,
              required: false,
            },
          ],
        },
        {
          model: RequestProduct,
          as: 'products',
          required: true,
          separate: true,
          order: [['product', 'name_ru', 'ASC']],
          include: [
            {
              model: Product,
              as: 'product',
              required: false,
            },
            {
              model: DescribedProduct,
              as: 'describedProduct',
              required: false,
            },
            {
              model: AutoBrand, // TODO: delete or leave
              as: 'autoBrand',
              required: false,
            },
            {
              model: RefundExchangeRequest,
              as: 'refundExchangeRequest',
              where: {
                status: {
                  [Op.ne]: 'CLOSED',
                },
              },
              required: false,
              include: [
                {
                  model: RequestProduct,
                  as: 'requestProduct',
                  required: true,
                  include: [
                    {
                      model: Product,
                      as: 'product',
                      required: false,
                      attributes: ['id', 'article', 'manufacturer', ['name_ru', 'name']],
                    },
                  ],
                },
                {
                  model: RefundExchangeRequestFile,
                  as: 'refundExchangeRequestFiles',
                  separate: true,
                  include: [{ model: FileModel, as: 'file' }],
                },
              ],
            },
            {
              model: RefundExchangeRequest,
              as: 'refundExchangeRequests',
              where: {
                status: 'CLOSED',
              },
              separate: true,
              order: [['createdAt', 'ASC']],
              include: [
                {
                  model: RequestProduct,
                  as: 'requestProduct',
                  include: [
                    {
                      model: Product,
                      as: 'product',
                      required: false,
                      attributes: ['id', 'article', 'manufacturer', ['name_ru', 'name']],
                    },
                  ],
                },
                {
                  model: RefundExchangeRequestFile,
                  as: 'refundExchangeRequestFiles',
                  separate: true,
                  include: [{ model: FileModel, as: 'file' }],
                },
              ],
            },
          ],
        },
        {
          model: TransportCompany,
          as: 'transportCompany',
          required: false,
        },
        {
          model: TransportCompany,
          as: 'notConfirmedTransportCompany',
          required: false,
        },
        {
          model: Reward,
          as: 'reward',
          required: false,
        },
      ],
    });

    options.include.push({
      model: RequestProduct,
      as: 'products',
      required: true,
      separate: true,
      include: [
        {
          model: Product,
          as: 'product',
          required: false,
          include: [
            {
              model: ProductFile,
              as: 'productFiles',
              where: { isActive: true },
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
        },
        {
          model: DescribedProduct,
          as: 'describedProduct',
          required: false,
          include: [
            {
              model: DescribedProductFile,
              as: 'productFiles',
              required: false,
              separate: true,
              include: [{ model: FileModel, as: 'file' }],
            },
            {
              model: DescribedProductAutoBrands,
              as: 'autoBrandsData',
              required: false,
              separate: true,
              include: [
                {
                  model: AutoType,
                  as: 'autoType',
                  required: false,
                },
                {
                  model: AutoBrand,
                  as: 'autoBrand',
                  required: false,
                },
              ],
            },
            {
              model: AutoBrand,
              as: 'autoBrand',
              required: false,
            },
            {
              model: ProductGroup,
              as: 'productGroup',
              required: false,
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

    options.include.push({
      model: PaymentRefundRequest,
      as: 'paymentRefundRequest',
      required: false,
      order: [['createdAt', 'DESC']],
    });

    options.include.push({
      model: Notification,
      as: 'notifications',
      where: {
        userId: authUser.id,
        roleId: authUserRole.roleId,
        type: {
          [Op.ne]: ENotificationType.dummy,
        },
      },
      required: false,
    });

    options.include.push({
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
    });

    // Get DB entity
    let orderRequest = await OrderRequest.findOne(options);

    if (!orderRequest) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Запрос с id ' + id + ' пользователя с id ' + authUser.id + ' не найден',
      });
    }

    for (const order of orderRequest.orders) {
      await order.update({ seenAt: new Date() });
    }

    const productGroups = await ProductGroup.findAll({
      where: {
        catalog: ['AUTO_PRODUCTS', 'AUTO_TOOLS'],
        nestingLevel: 0,
      },
    });

    // Transform OrderRequest to plain object
    orderRequest = orderRequest.toJSON() as OrderRequest;

    // Transform request products
    orderRequest.products = orderRequest.products.map(product => ({
      ...product,
      product: product?.product ? transformProduct(product.product) : null,
      describedProduct: product?.describedProduct
        ? transformDescribedProduct({
            product: product.describedProduct,
            productGroups,
          })
        : null,
    })) as any;

    // Transform orders products
    orderRequest.orders = orderRequest.orders.map(order => ({
      ...order,
      products: order.products.map(orderProduct => {
        const refundExchangeRequest =
          orderProduct?.refundExchangeRequest || _.maxBy(orderProduct.refundExchangeRequests, 'createdAt');
        return {
          ...orderProduct,
          refundExchangeRequest: !!refundExchangeRequest
            ? {
                ...refundExchangeRequest,
                status:
                  refundExchangeRequest?.status === 'CLOSED'
                    ? 'CLOSED'
                    : refundExchangeRequest?.isRejected
                    ? 'REJECTED'
                    : refundExchangeRequest.status,
              }
            : null,
          refundExchangeRequests: orderProduct.refundExchangeRequests.filter(el => el.id !== refundExchangeRequest?.id),
          product: orderProduct?.product ? transformProduct(orderProduct.product) : null,
        };
      }),
    })) as any;

    // Transform attachments
    orderRequest['attachments'] = orderRequest.orderRequestFiles.map(orderRequestFile => ({
      id: orderRequestFile.id,
      userId: orderRequestFile?.file?.userId,
      orderId: orderRequestFile.orderId,
      group: orderRequestFile.group,
      name: orderRequestFile?.file?.name,
      ext: orderRequestFile?.file?.ext,
      url: getFilePreviewUrl(orderRequestFile.file),
    }));

    // Add refund/exchange attachments
    orderRequest.orders = orderRequest.orders.filter(offer => !!offer?.seller);

    if (
      (['PAID', 'PAYMENT_POSTPONED', 'COMPLETED', 'DECLINED'] as Array<OrderRequest['status']>).includes(
        orderRequest.status,
      )
    ) {
      orderRequest.orders = orderRequest.orders.filter(offer =>
        (['PAID', 'PAYMENT_POSTPONED'] as Array<Order['status']>).includes(offer.status),
      );
    }

    orderRequest.orders.forEach(({ products, seller }) => {
      products
        .filter(({ refundExchangeRequest }) => !!refundExchangeRequest)
        .forEach(({ refundExchangeRequest }) => {
          refundExchangeRequest['attachments'] = refundExchangeRequest.refundExchangeRequestFiles.map(({ file }) => ({
            name: file.name,
            url: getFilePreviewUrl(file),
          }));
        });
      seller = simplifyUser(seller) as any;
    });

    orderRequest['inHistory'] = ['COMPLETED', 'DECLINED'].includes(orderRequest.status);

    // Add commissionType to orderRequest
    if (
      !(['REQUESTED', 'APPROVED'] as Array<OrderRequest['status']>).includes(orderRequest.status) &&
      (!!orderRequest?.payerId || !!orderRequest?.paymentId)
    ) {
      for (const offer of orderRequest.orders) {
        const org = offer.organization;
        org.isServiceOrganization = org.inn === SERVICE_ORGANIZATION_INN;

        if (!!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice) {
          offer.organization = {
            ...org,
            ...getOrganizationComission(org),
          } as Organization;
          offer['commissionType'] = !!orderRequest?.payerId ? 'invoice' : 'acquiring';
        }

        const comission =
          !!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice
            ? !!orderRequest?.payerId
              ? org.priceBenefitPercentInvoice
              : org.priceBenefitPercentAcquiring
            : org.isServiceOrganization
            ? 0
            : org.priceBenefitPercent;
        offer['hideSupplierPayments'] = comission < ORGANIZATION_MIN_DISCOUNT_PERCENT;
      }
    }

    orderRequest = formatOrderRequestStatus(
      orderRequest,
      (EMPLOYEE_ROLES as string[]).includes(authUserRole.role.label) ? 'employee' : (authUserRole.role.label as any),
      authUserRole.role.label === 'seller' && authUser.id,
    );

    return {
      orderRequest,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке запроса',
      error: err,
    });
  }
};
