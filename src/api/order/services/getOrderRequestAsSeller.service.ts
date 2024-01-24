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
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import OrderRequest from '../models/OrderRequest.model';
import UserRoles from '../../role/models/UserRoles.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import FileModel from '../../files/models/File.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import Order from '../models/Order.model';
import Organization from '../../organization/models/Organization.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import RequestProduct from '../models/RequestProduct.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import RefundExchangeRequestFile from '../models/RefundExchangeRequestFile.model';
import ProductFile from '../../catalog/models/ProductFile.model';
import DescribedProductFile from '../../catalog/models/DescribedProductFile.model';
import { ENotificationType } from '../../notification/interfaces';
import { getFilePreviewUrl, transformDescribedProduct, transformProduct } from '../../catalog/utils';
import { simplifyUser } from '../../user/utils';
import { formatOrderRequestStatus } from '../utils';
import Notification from '../../notification/models/Notification.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import _ from 'lodash';
import DescribedProductAutoBrands from '../../catalog/models/DescribedProductAutoBrands.model';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import { getOrganizationComission } from '../../organization/utils';

interface IProps {
  id: string;
  req: Request;
  res: Response;
}

interface IResult {
  orderRequest: OrderRequest;
}

export const getOrderRequestAsSellerService = async ({ id, req, res }: IProps): Promise<IResult> => {
  try {
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;

    // Define options
    const options: seq.FindAndCountOptions = {};
    options.where = {
      [Op.and]: [],
    };
    options.include = [];

    // Where OrderRequest id
    options.where[Op.and].push({
      id,
      managerDeletedAt: null,
    });

    // Include OrderRequest files
    options.include.push({
      model: OrderRequestFile,
      as: 'orderRequestFiles',
      required: false,
      separate: true,
      include: [{ model: FileModel, as: 'file' }],
    });

    // Include customer user
    options.include.push({
      model: User,
      as: 'customer',
    });

    options.include.push({
      model: JuristicSubject,
      as: 'payer',
      required: false,
    });

    // Include seller's offers
    options.include.push({
      model: Order,
      as: 'orders',
      required: false,
      where: {
        sellerId: authUser.id,
      },
      include: [
        {
          model: Organization,
          as: 'organization',
          include: [{ model: Address, as: 'actualAddress' }],
        },
        {
          model: User,
          as: 'seller',
        },
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
          required: false,
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
          model: JuristicSubject,
          as: 'paymentPostponeCustomerOrganization',
          required: false,
        },
      ],
    });

    // Include delivery address
    options.include.push({
      model: Address,
      as: 'address',
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
    // Transform OrderRequest to plain object
    orderRequest = orderRequest.toJSON() as OrderRequest;

    if (!['REQUESTED', 'APPROVED'].includes(orderRequest.status) && !orderRequest?.orders?.length) {
      return {
        orderRequest: null,
      };
    }

    const sellerOffer = orderRequest?.orders?.[0];

    const requestProductEntities = await RequestProduct.findAll({
      where: {
        orderRequestId: orderRequest.id,
      },
      order: [['product', 'name_ru', 'ASC']],
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
    orderRequest.products = requestProductEntities.map(el => el.toJSON() as RequestProduct);

    if (!!orderRequest?.orders?.length) {
      const offerProducts = await RequestProduct.findAll({
        where: {
          orderId: orderRequest.orders[0].id,
        },
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
            include: [
              {
                model: DescribedProductAutoBrands,
                as: 'autoBrandsData',
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
      });
      orderRequest.orders[0].products = offerProducts.map(el => el.toJSON() as RequestProduct);
    }

    // Transform products
    const sellerAutoBrands = await SellerAutoBrands.findAll({
      where: {
        userId: authUser.id,
      },
    });
    const sellerProductGroups = await SellerProductGroups.findAll({
      where: {
        userId: authUser.id,
      },
    });
    const productGroups = await ProductGroup.findAll({
      where: {
        catalog: ['AUTO_PRODUCTS', 'AUTO_TOOLS'],
        nestingLevel: 0,
      },
    });

    const requestProducts: RequestProduct[] = [];
    for (const requestProduct of orderRequest.products) {
      if (!!requestProduct?.productId) {
        const orderRequestSellerData = await OrderRequestSellerData.findOne({
          where: {
            orderRequestId: id,
            sellerId: authUser.id,
          },
        });

        const productIds = JSON.parse(orderRequestSellerData?.productIds || '[]');
        if (
          productIds.includes(requestProduct.productId) ||
          !!orderRequest?.orders?.[0]?.products?.find(el => el?.productId === requestProduct?.product?.id)
        ) {
          // Show product to seller if it matches to seller's categories or if the product is in seller's offer
          requestProducts.push(requestProduct);
        }
      }

      if (!!requestProduct.describedProduct) {
        requestProduct.describedProduct.autoBrandsData = requestProduct?.describedProduct?.autoBrandsData?.filter(
          item =>
            !!sellerAutoBrands.find(el => el.autoTypeId === item.autoTypeId && el.autoBrandId === item.autoBrandId),
        );
        requestProduct.describedProduct.productGroupIds = requestProduct?.describedProduct?.productGroupIds?.filter(
          itemId => !!sellerProductGroups.find(el => el.productGroupId === itemId),
        );
        requestProducts.push(requestProduct);
      }
    }

    orderRequest.products = orderRequest?.products
      ?.filter(requestProduct => !!requestProducts.find(el => el.id === requestProduct.id))
      ?.map(product => ({
        ...product,
        product: !!product?.product ? transformProduct(product.product) : null,
        describedProduct: product?.describedProduct
          ? transformDescribedProduct({
              product: product.describedProduct,
              productGroups,
            })
          : null,
      })) as any;

    orderRequest.orders = orderRequest.orders.map(
      order =>
        ({
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
              refundExchangeRequests: orderProduct?.refundExchangeRequests?.filter(
                el => el.id !== refundExchangeRequest?.id,
              ),
              product: !!orderProduct?.product ? transformProduct(orderProduct.product) : null,
              describedProduct: !!orderProduct?.describedProduct
                ? transformDescribedProduct({ product: orderProduct.describedProduct })
                : null,
            };
          }),
        } as any),
    );

    // Transform attached files
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
    orderRequest.orders.forEach(({ products, seller }) => {
      products
        ?.filter(({ refundExchangeRequest }) => !!refundExchangeRequest)
        ?.forEach(({ refundExchangeRequest }) => {
          refundExchangeRequest['attachments'] = refundExchangeRequest.refundExchangeRequestFiles.map(({ file }) => ({
            name: file.name,
            url: getFilePreviewUrl(file),
          }));
        });
      seller = simplifyUser(seller) as any;
    });

    orderRequest['inHistory'] =
      (['PAYMENT_POSTPONED', 'PAID', 'COMPLETED'].includes(orderRequest.status) &&
        !!orderRequest?.orders?.[0]?.receivingDate &&
        sellerOffer?.status === 'PAID') ||
      orderRequest.status === 'DECLINED';
    orderRequest['hasActiveRefundExchangeRequest'] = orderRequest.orders.some(order =>
      order.products.some(
        product => !!product?.refundExchangeRequest && product?.refundExchangeRequest?.status !== 'CLOSED',
      ),
    );

    // Add commissionType to orderRequest
    if (
      !(['REQUESTED', 'APPROVED'] as Array<OrderRequest['status']>).includes(orderRequest.status) &&
      (!!orderRequest?.payerId || !!orderRequest?.paymentId)
    ) {
      const org = orderRequest?.orders?.[0]?.organization;
      if (!!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice) {
        orderRequest.orders[0].organization = {
          ...org,
          ...getOrganizationComission(org),
        } as Organization;
        orderRequest['commissionType'] = !!orderRequest?.payerId ? 'invoice' : 'acquiring';
      }
    }

    orderRequest = formatOrderRequestStatus(orderRequest, 'seller', authUser.id);
    // Mutation phone
    if (orderRequest.customer.phoneIsHidden) {
      orderRequest.customer.phone = 'hidden';
    }

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
