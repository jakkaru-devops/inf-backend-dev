import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import Product from '../../catalog/models/Product.model';
import { generatePdfFromTemplate } from '../../../utils/pdf.utils';
import Order from '../models/Order.model';
import RequestProduct from '../models/RequestProduct.model';
import formatDate from 'date-fns/format';
import {
  convertAddressToString,
  gaussRound,
  getUserName,
  millisecondsToMdhm,
  separateNumberBy,
} from '../../../utils/common.utils';
import { getOrgName } from '../../organization/utils';
import { transformProduct } from '../../catalog/utils';
import UserRoles from '../../role/models/UserRoles.model';
import { ServiceError } from '../../../core/utils/serviceError';
import ordersService from '../orders.service';

interface IProps {
  orderId: string;
  mode: 'extended' | 'list';
  authUser: User;
  authUserRole: UserRoles;
}

interface IResult {
  file: Buffer;
}

export const getSelectedProductListDocPdfService = async ({
  orderId,
  mode,
  authUser,
  authUserRole,
}: IProps): Promise<IResult> => {
  try {
    const { orderRequest, offers, selectedProducts } = await ordersService.getOrderRequestWithOffers({
      orderId,
      regionFiasId: null,
      authUser,
      authUserRole,
    });

    if (!orderRequest) {
      throw new ServiceError({
        status: httpStatus.NOT_FOUND,
        message: 'Запрос с id ' + orderId + ' пользователя с id ' + authUser.id + ' не найден',
      });
    }

    if (!mode || mode === 'extended') {
      if (mode === 'extended') {
        offers.rows = offers.rows
          .map(
            offer =>
              ({
                ...offer,
                products: offer.products.filter(product => product.isSelected),
              } as Order),
          )
          .filter(offer => !!offer?.products?.length);
      }

      const data = {
        idOrder: orderRequest.idOrder,
        date: formatDate(new Date(orderRequest.createdAt), 'dd.MM.yyyy HH:mm'),
        offers: offers.rows.map((offer, i) => ({
          index: i + 1,
          hasNds: offer.organization.hasNds,
          seller: {
            name: getUserName(offer.seller),
            rating: offer.seller.ratingValue ?? 0,
            stars:
              offer.seller.ratingValue < 1
                ? [false, false, false, false, false]
                : Array(false, false, false, false, false).fill(true, 0, Math.round(offer.seller.ratingValue) - 1),
            reviewsNumber: offer.seller.reviews.length,
            salesNumber: offer.seller.salesNumber || 0,
          },
          requestChanged: !!offer?.products?.filter(
            ({ altName, altManufacturer, altArticle }) => !!altName || !!altManufacturer || !!altArticle,
          )?.length,
          address: convertAddressToString(offer.organization.actualAddress, 'full'),
          organizationName: getOrgName(offer.organization, true, true),
          offerTerm:
            Number(new Date(offer.createdAt).setDate(new Date(offer.createdAt).getDate() + 5)) - Number(new Date()) > 0
              ? millisecondsToMdhm(
                  Number(new Date(offer.createdAt).setDate(new Date(offer.createdAt).getDate() + 5)) -
                    Number(new Date()),
                )
              : 'Предложение истекло',
          products: offer.products
            .filter(product => (!!mode ? product.isSelected : true))
            .map((product, i) => ({
              index: i + 1,
              article: product?.altArticle || product.product.article,
              name: product?.altName || product.product.name_ru,
              manufacturer: product?.altManufacturer || product.product.manufacturer || '-',
              count: product.count || 1,
              quantity: product.quantity || '-',
              unitPrice: product.unitPrice,
              totalPrice: product.unitPrice * ((product?.count || 0) + product?.deliveryQuantity || 0),
              deliveryQuantity: product.deliveryQuantity,
              deliveryTerm: product.deliveryTerm,
            })),
          total: {
            count: offer.products
              // .filter(({ isSelected }) => isSelected)
              .map(({ count }) => count)
              .reduce((a, b) => a + b, 0),
            quantity: offer.products
              // .filter(({ isSelected }) => isSelected)
              .map(product => product.quantity)
              .filter(Boolean)
              .reduce((a, b) => a + b, 0),
            price: gaussRound(
              offer.products
                // .filter(({ isSelected }) => isSelected)
                .map(product => product.unitPrice * product?.count)
                .filter(Boolean)
                .reduce((a, b) => a + b, 0),
              2,
            ),
          },
        })),
        totalPrice: 0,
        products: [],
      };

      // Count order request total price
      data.totalPrice = data.offers.map(({ total }) => total.price).reduce((a, b) => a + b, 0);

      // Get selected products
      let requestProducts = await RequestProduct.findAll({
        where: {
          productId: orderRequest.products.filter(({ product }) => !!product).map(({ product }) => product.id),
          isSelected: true,
        },
        order: [['product', 'name_ru', 'ASC']],
        include: [
          {
            model: Order,
            as: 'order',
            required: true,
            attributes: ['orderRequestId'],
            where: { orderRequestId: orderRequest.id },
          },
          {
            model: Product,
            as: 'product',
            required: true,
          },
        ],
      });

      requestProducts = requestProducts
        .map(product => {
          product = product.toJSON() as RequestProduct;
          return {
            ...product,
            product: transformProduct(product.product),
          };
        })
        .filter(Boolean) as any;

      const selectedProductList = Object.values(
        requestProducts.reduce((a, b) => {
          if (!a[b.product.id]) a[b.product.id] = { ...b, unitPrice: 0, count: 0, totalPrice: 0 };
          a[b.product.id].totalPrice += b.unitPrice * b.count;
          a[b.product.id].count += b.count;
          return a;
        }, {}),
      );

      data.products = selectedProductList;

      const file = await generatePdfFromTemplate({
        data,
        pathToTemplate: `templates/selected-products/extended.hbs`,
      });

      return {
        file,
      };
    } else {
      const data = {
        idOrder: orderRequest.idOrder,
        date: formatDate(new Date(orderRequest.createdAt), 'dd.MM.yyyy HH:mm'),
        products: [],
        totalPrice: 0,
      };

      data.products = selectedProducts.map((product, i) => ({
        // index: i + 1,
        name: product.product.name,
        manufacturer: product.product.manufacturer || '-',
        article: product.product.article || '-',
        count: product.count || '-',
        totalPrice: separateNumberBy(gaussRound(product.totalPrice, 2), ' '),
      }));
      data.totalPrice = gaussRound(
        selectedProducts.map(product => product.totalPrice as number).reduce((a, b) => a + b),
        2,
      );

      const file = await generatePdfFromTemplate({
        data,
        pathToTemplate: `templates/selected-products/list.hbs`,
      });

      return {
        file,
      };
    }
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при генерации списка товаров',
      error: err,
    });
  }
};
