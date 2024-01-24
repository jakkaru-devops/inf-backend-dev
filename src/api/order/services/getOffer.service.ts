import httpStatus from 'http-status';
import { ServiceError } from '../../../core/utils/serviceError';
import Organization from '../../organization/models/Organization.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Address from '../../address/models/Address.model';
import User from '../../user/models/User.model';
import UserReview from '../../user/models/UserReview.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import Reward from '../models/Reward.model';
import Notification from '../../notification/models/Notification.model';
import UserRoles from '../../role/models/UserRoles.model';
import { ENotificationType } from '../../notification/interfaces';
import RequestProduct from '../models/RequestProduct.model';
import Product from '../../catalog/models/Product.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import RefundExchangeRequest from '../models/RefundExchangeRequest.model';
import RefundExchangeRequestFile from '../models/RefundExchangeRequestFile.model';
import FileModel from '../../files/models/File.model';
import { simplifyUser } from '../../user/utils';
import { getFilePreviewUrl, transformProduct } from '../../catalog/utils';
import { entityToJSON } from '../../../utils/common.utils';

interface IProps {
  orderId: OrderRequest['id'];
  offerId: Order['id'];
  authUser: User;
  authUserRole: UserRoles;
}

export const getOfferService = async ({ orderId, offerId, authUser, authUserRole }: IProps) => {
  const offer = entityToJSON<Order>(await Order.findByPk(offerId));

  if (!offer || offer.orderRequestId !== orderId)
    throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Предложение не найдено' });

  offer.organization = entityToJSON<Organization>(
    await Organization.findByPk(offer.organizationId, {
      include: [{ model: Address, as: 'actualAddress', required: true }],
    }),
  );
  if (!offer.organization) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Организация не найдена' });

  offer.supplierAddress = !!offer?.supplierAddressId
    ? entityToJSON<Address>(await Address.findByPk(offer.supplierAddressId)) || offer.organization.actualAddress
    : offer.organization.actualAddress;

  offer.seller = simplifyUser(
    entityToJSON<User>(
      await User.findByPk(offer.sellerId, {
        include: [{ model: UserReview, as: 'reviews', required: false, separate: true }],
      }),
    ),
  ) as any;
  offer.organizationSeller = entityToJSON<OrganizationSeller>(
    await OrganizationSeller.findOne({
      where: {
        id: offer.organizationSellerId,
        detachedAt: null,
      },
    }),
  );

  if (!offer.seller || !offer.organizationSeller)
    throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Продавец не найден' });

  offer.transportCompany = !!offer.transportCompanyId
    ? entityToJSON<TransportCompany>(await TransportCompany.findByPk(offer.transportCompanyId))
    : null;

  offer.reward =
    entityToJSON<Reward>(
      await Reward.findOne({
        where: {
          orderId: offer.id,
        },
      }),
    ) || null;

  offer.notifications = (
    await Notification.findAll({
      where: {
        orderId: offer.id,
        userId: authUser.id,
        roleId: authUserRole.roleId,
      },
    })
  ).map(el => entityToJSON<Notification>(el));

  offer.unreadNotifications = offer.notifications.filter(el => !el?.viewedAt && el?.type !== ENotificationType.dummy);

  offer.products = (
    await RequestProduct.findAll({
      where: {
        orderId: offer.id,
      },
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
    })
  ).map(el => entityToJSON<RequestProduct>(el));

  const requestProducts = (
    await RequestProduct.findAll({
      where: {
        orderRequestId: orderId,
        id: offer.products.map(offerProduct => offerProduct.requestedProductId),
      },
      include: [
        {
          model: Product,
          as: 'product',
          required: false,
        },
      ],
    })
  ).map(el => entityToJSON<RequestProduct>(el));

  for (const offerProduct of offer.products) {
    offerProduct.count =
      offerProduct.count ||
      Math.min(
        offerProduct.quantity + offerProduct.deliveryQuantity,
        requestProducts?.find(requestProduct => requestProduct.productId === offerProduct.productId)?.quantity || 0,
      );

    if (!!offerProduct.product) offerProduct.product = transformProduct(offerProduct.product);

    if (!!offerProduct?.refundExchangeRequest) {
      offerProduct.refundExchangeRequest['attachments'] =
        offerProduct.refundExchangeRequest.refundExchangeRequestFiles.map(({ file }) => ({
          name: file.name,
          url: getFilePreviewUrl(file),
        }));
    }
  }

  return offer;
};
