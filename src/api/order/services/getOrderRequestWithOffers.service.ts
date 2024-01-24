import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Address from '../../address/models/Address.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import Product from '../../catalog/models/Product.model';
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
import PaymentRefundRequest from '../models/PaymentRefundRequest.model';
import { ENotificationType } from '../../notification/interfaces';
import { getFilePreviewUrl, transformDescribedProduct, transformProduct } from '../../catalog/utils';
import { simplifyUser } from '../../user/utils';
import Notification from '../../notification/models/Notification.model';
import Region from '../../regions/models/Region.model';
import { ServiceError } from '../../../core/utils/serviceError';
import { IPaginationParams } from '../../../interfaces/common.interfaces';

interface IProps {
  orderId: OrderRequest['id'];
  regionFiasId?: string;
  authUser: User;
  authUserRole: UserRoles;
  pagination?: IPaginationParams;
  filterBy?: 'PRICE' | 'DELIVERY';
  filterProductId?: string;
}

interface IResult {
  orderRequest: OrderRequest;
  offers: {
    rows: Order[];
    count: number;
  };
  selectedProducts: any[];
  regions: Region[];
}

export const getOrderRequestWithOffersService = async ({
  orderId,
  regionFiasId,
  authUser,
  authUserRole,
  pagination,
  filterBy,
  filterProductId,
}: IProps): Promise<IResult> => {
  try {
    const orderOptions: seq.FindAndCountOptions = {};
    orderOptions.where = { id: orderId };
    orderOptions.include = [
      {
        model: OrderRequestFile,
        as: 'orderRequestFiles',
        required: false,
        separate: true,
        include: [{ model: FileModel, as: 'file' }],
      },
      { model: User, as: 'customer' },
      { model: JuristicSubject, as: 'payer', required: false },
      {
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
        ],
      },
      { model: Address, as: 'address', required: false },
      {
        model: Notification,
        as: 'notifications',
        where: {
          userId: authUser.id,
          roleId: authUserRole.roleId,
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
        model: PaymentRefundRequest,
        as: 'paymentRefundRequest',
        required: false,
        order: [['createdAt', 'DESC']],
      },
    ];

    // Get DB entity
    let order = await OrderRequest.findOne(orderOptions);

    const offerOptions: seq.FindAndCountOptions = {
      ...pagination,
      order: [['createdAt', 'DESC']],
      distinct: true, // for exact filtering
      subQuery: false,
      include: [],
    };
    offerOptions.where = { orderRequestId: orderId };

    if (!!regionFiasId) {
      offerOptions.where.regionFiasId = regionFiasId;
    }

    offerOptions.include.push({
      model: Organization,
      as: 'organization',
      required: true,
      include: [{ model: Address, as: 'actualAddress' }],
    });

    offerOptions.include.push({
      model: OrganizationSeller,
      as: 'organizationSeller',
      required: true,
      where: {
        detachedAt: null,
      },
    });

    offerOptions.include.push({
      model: Address,
      as: 'supplierAddress',
      required: false,
    });

    offerOptions.include.push({
      model: User,
      as: 'seller',
      required: true,
      include: [
        {
          model: UserReview,
          as: 'reviews',
          required: false,
          separate: true,
        },
      ],
    });

    if (filterBy === 'PRICE') {
      offerOptions.include.push({
        model: RequestProduct,
        as: 'products',
        required: true,
        order: [['unitPrice', 'ASC']],
        include: [
          {
            model: Product,
            as: 'product',
            required: true,
            where: {
              id: filterProductId,
            },
          },
          { model: DescribedProduct, as: 'describedProduct', required: false },
          { model: AutoBrand, as: 'autoBrand', required: false },
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
            include: [
              {
                model: RequestProduct,
                as: 'requestProduct',
                required: true,
                include: [
                  {
                    model: Product,
                    as: 'product',
                    required: true,
                    where: {
                      id: filterProductId,
                    },
                  },
                ],
              },
              {
                model: RefundExchangeRequestFile,
                as: 'refundExchangeRequestFiles',
                include: [{ model: FileModel, as: 'file' }],
              },
            ],
          },
        ],
      });
    } else if (filterBy === 'DELIVERY') {
      offerOptions.include.push({
        model: RequestProduct,
        as: 'products',
        required: true,
        include: [
          {
            model: Product,
            as: 'product',
            required: true,
            where: {
              id: filterProductId,
            },
          },
          { model: DescribedProduct, as: 'describedProduct', required: false },
          { model: AutoBrand, as: 'autoBrand', required: false },
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
            include: [
              {
                model: RequestProduct,
                as: 'requestProduct',
                required: true,
                include: [
                  {
                    model: Product,
                    as: 'product',
                    required: true,
                    where: {
                      id: filterProductId,
                    },
                  },
                ],
              },
              {
                model: RefundExchangeRequestFile,
                as: 'refundExchangeRequestFiles',
                include: [{ model: FileModel, as: 'file' }],
              },
            ],
          },
        ],
      });
    } else {
      offerOptions.include.push({
        model: RequestProduct,
        as: 'products',
        required: true,
        separate: true,
        order: [['product', 'name_ru', 'ASC']],
        include: [
          { model: Product, as: 'product', required: false },
          { model: DescribedProduct, as: 'describedProduct', required: false },
          { model: AutoBrand, as: 'autoBrand', required: false },
          {
            model: RefundExchangeRequest,
            as: 'refundExchangeRequest',
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
                  },
                ],
              },
              {
                model: RefundExchangeRequestFile,
                as: 'refundExchangeRequestFiles',
                include: [{ model: FileModel, as: 'file' }],
              },
            ],
          },
        ],
      });
    }

    offerOptions.include.push({
      model: TransportCompany,
      as: 'transportCompany',
      required: false,
    });

    offerOptions.include.push({
      model: Reward,
      as: 'reward',
      required: false,
    });

    offerOptions.include.push({
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
      separate: true,
    });

    offerOptions.include.push({
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
      separate: true,
    });

    // Get DB entity
    let offers = await Order.findAndCountAll(offerOptions);

    if (!order)
      throw new ServiceError({
        status: httpStatus.NOT_FOUND,
        message: `Запрос ${orderId} не найден`,
      });

    for (const offer of offers.rows) {
      await offer.update({ seenAt: new Date() });
      offer.seller = simplifyUser(offer.seller) as any;
    }

    // Transform to plain object
    order = order.toJSON() as OrderRequest;
    offers.rows = offers.rows.map(offer => offer.toJSON() as Order).filter(offer => !!offer?.products?.length);

    // Transform request products
    order.products = order.products.map(product => ({
      ...product,
      product: product?.product ? transformProduct(product.product) : null,
      describedProduct: product?.describedProduct
        ? transformDescribedProduct({
            product: product.describedProduct,
          })
        : null,
    })) as any;

    // Transform orders products
    offers.rows = offers.rows.map(offer => ({
      ...offer,
      products: offer.products.map(product => ({
        ...product,
        count:
          product.count ||
          Math.min(
            product.quantity + product.deliveryQuantity,
            order?.products?.find(({ productId }) => productId === product.productId)?.quantity || 0,
          ),
        product: product?.product ? transformProduct(product.product) : null,
      })),
      supplierAddress: offer?.supplierAddress || offer?.organization?.actualAddress,
    })) as any;

    // Transform attachments
    order['attachments'] = order.orderRequestFiles
      .filter(el => !!el?.file)
      .map(orderRequestFile => ({
        id: orderRequestFile.id,
        userId: orderRequestFile?.file?.userId,
        orderId: orderRequestFile.orderId,
        group: orderRequestFile.group,
        name: orderRequestFile.file.name,
        ext: orderRequestFile.file.ext,
        url: getFilePreviewUrl(orderRequestFile.file),
      }));

    // Add refund/exchange attachments
    offers.rows.forEach(({ products }) =>
      products
        .filter(({ refundExchangeRequest }) => !!refundExchangeRequest)
        .forEach(({ refundExchangeRequest }) => {
          refundExchangeRequest['attachments'] = refundExchangeRequest.refundExchangeRequestFiles.map(({ file }) => ({
            name: file.name,
            url: getFilePreviewUrl(file),
          }));
        }),
    );

    let requestProducts = await RequestProduct.findAll({
      where: { productId: order?.products?.map(({ product }) => product?.id), isSelected: true },
      order: [['product', 'name_ru', 'ASC']],
      include: [
        {
          model: Order,
          as: 'order',
          required: true,
          attributes: ['orderRequestId'],
          where: { orderRequestId: order.id },
        },
        { model: Product, as: 'product', required: true },
      ],
    });

    requestProducts = requestProducts.map(product => {
      product = product.toJSON() as RequestProduct;
      return {
        ...product,
        product: transformProduct(product.product),
      };
    }) as any;

    const selectedProducts = Object.values(
      requestProducts.reduce((a, b) => {
        if (!a[b.product.id]) a[b.product.id] = { ...b, unitPrice: 0, count: 0, totalPrice: 0 };
        a[b.product.id].totalPrice += b.unitPrice * b.count;
        a[b.product.id].count += b.count;
        return a;
      }, {}),
    );

    if (filterBy === 'DELIVERY') {
      offers.rows.sort((a, b) => {
        // Дистания между городами А и В
        const distanceA = a.distanceToSupplier;
        const distanceB = b.distanceToSupplier;

        // Количество товара на складе у продавца А и В
        const totalQuantityA = a.products.reduce((total, product) => total + product.quantity, 0);
        const totalQuantityB = b.products.reduce((total, product) => total + product.quantity, 0);

        // Количество товара под заказ у продавца А и В
        const deliveryQuantityA = a.products.reduce((total, product) => total + product.deliveryQuantity, 0);
        const deliveryQuantityB = b.products.reduce((total, product) => total + product.deliveryQuantity, 0);

        // Количество дней доставки до покупателя под заказ у продавца А и В
        const deliveryTermA = a.products.reduce((total, product) => total + product.deliveryTerm, 0);
        const deliveryTermB = b.products.reduce((total, product) => total + product.deliveryTerm, 0);

        // Количество запрошеного единиц товара у продавца А и В
        const countQuantityA = b.products.reduce((total, product) => total + product.count, 0);
        const countQuantityB = b.products.reduce((total, product) => total + product.count, 0);

        // Проверка наличия товара на складе
        if ((totalQuantityA > 0 && totalQuantityB <= 0) || (totalQuantityA <= 0 && totalQuantityB > 0)) {
          return totalQuantityB - totalQuantityA;
        }
        // Проверка количества запрещенного товара
        if (countQuantityA !== countQuantityB) {
          return countQuantityA - countQuantityB;
        }
        // Если количество товара на складе у обоих продавцов одинаковое (или у обоих нет товара на складе)
        if (distanceA !== distanceB) {
          return distanceA - distanceB; // Сначала сортируем по расстоянию
        }
        if (totalQuantityA !== totalQuantityB) {
          return totalQuantityB - totalQuantityA; // Затем сортируем по количеству товара на складе
        }
        // Если расстояние и количество товара на складе одинаковы
        if (deliveryQuantityA !== deliveryQuantityB) {
          return deliveryQuantityB - deliveryQuantityA; // Затем сортируем по количеству товара под заказ (от большего к меньшему)
        }
        // Если все параметры одинаковы
        return deliveryTermA - deliveryTermB; // Сортировка по времени доставки (от меньшего к большему)
      });

      offers.rows = offers.rows.filter((_, index) => index < 3);
    } else if (filterBy === 'PRICE') {
      offers.rows.sort((a, b) => {
        const totalQuantityA = a.products.reduce((total, product) => total + product.unitPrice, 0);
        const totalQuantityB = b.products.reduce((total, product) => total + product.unitPrice, 0);

        return totalQuantityA - totalQuantityB;
      });

      offers.rows = offers.rows.filter((_, index) => index < 3);
    }

    const allOffers = await Order.findAll({
      where: {
        orderRequestId: order.id,
      },
      attributes: ['orderRequestId', 'regionFiasId'],
    });
    const regions = await Region.findAll({
      where: {
        fias_id: allOffers.map(({ regionFiasId }) => regionFiasId),
      },
    });

    return {
      orderRequest: order,
      offers,
      selectedProducts,
      regions,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке запроса с предложениями',
      error: err,
    });
  }
};
