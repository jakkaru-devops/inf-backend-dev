import Product from '../models/Product.model';
import StockBalance from '../models/StockBalance.model';
import { Op } from 'sequelize';
import Warehouse from '../models/Warehouse.model';
import Organization from '../../organization/models/Organization.model';
import User from '../../user/models/User.model';
import { getOrgName } from '../../organization/utils';
import { getUserName } from '../../../utils/common.utils';
import UserReview from '../../user/models/UserReview.model';
import Address from '../../address/models/Address.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import { PricedProductReservation } from '../models/PricedProductReservation.model';
import _ from 'lodash';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import { IProductPriceOffer, IProductPriceOfferGroup } from '../interfaces';

interface IProps {
  productId: Product['id'];
}

export const getProductPricesService = async ({ productId }: IProps) => {
  const product = await Product.findByPk(productId);
  if (!product)
    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Товар не найден',
    });

  let childProducts: Product[] = [];

  if (!product.mainProductId) {
    childProducts = await Product.findAll({
      where: {
        mainProductId: productId,
      },
    });
  }

  const allProducts = [product, ...childProducts];
  const productIds = allProducts.map(el => el.id);

  const allPriceOffers = await StockBalance.findAll({
    where: {
      productId: productIds,
      amount: { [Op.gt]: 0 },
    },
    order: [['price', 'ASC']],
  });
  const warehouses = await Warehouse.findAll({
    where: {
      id: _.uniq(allPriceOffers.map(el => el.warehouseId)),
    },
  });
  const currentReservations = await PricedProductReservation.findAll({
    where: {
      priceOfferId: allPriceOffers.map(el => el.id),
      expiresAt: { [Op.gt]: new Date() },
    },
  });

  const organizations = await Organization.findAll({
    where: {
      id: warehouses.map(el => el.organizationId),
    },
  });
  const sellers = await User.findAll({
    where: {
      id: warehouses.map(el => el.sellerId),
    },
  });

  const priceOffers: IProductPriceOffer[] = [];
  for (const priceOffer of allPriceOffers) {
    const warehouse = warehouses.find(el => el.id === priceOffer.warehouseId);
    if (!warehouse) continue;

    const reservations = currentReservations.filter(el => el.priceOfferId === priceOffer.id);
    const organization = organizations.find(el => el.id === warehouse.organizationId);
    const seller = sellers.find(el => el.id === warehouse.sellerId);
    const product = allProducts.find(el => el.id === priceOffer.productId);

    if (!warehouse || !organization || !seller) continue;

    // Subtract reserved amount
    const reservedAmount = reservations.map(el => el.quantity).reduce((a, b) => a + b, 0);
    const productAmount = priceOffer.amount - reservedAmount;
    if (productAmount <= 0) continue;

    const reviewsNumber = await UserReview.count({
      where: {
        receiverId: seller.id,
      },
    });
    const orgSeller = await OrganizationSeller.findOne({
      where: {
        organizationId: organization.id,
        userId: seller.id,
      },
    });
    const sellerBranch = await OrganizationBranch.findByPk(orgSeller.branchId);
    const address = await Address.findByPk(sellerBranch.actualAddressId);

    priceOffers.push({
      id: priceOffer.id,
      organization: {
        id: organization.id,
        name: getOrgName(organization, true, true),
        inn: organization.inn,
      },
      address: {
        settlement: address?.city || address?.settlement,
      },
      seller: {
        id: seller.id,
        fullName: getUserName(seller, 'lf'),
        firstName: seller.firstname,
        lastName: seller.lastname,
        middleName: seller.middlename,
        ratingValue: seller.ratingValue,
        reviewsNumber,
        salesNumber: seller.salesNumber,
      },
      warehouse: {
        id: warehouse.id,
      },
      productName: product.pureName || priceOffer?.nameInPrice || product.name_ru,
      manufacturer: priceOffer?.brand || product?.manufacturer || null,
      productAmount,
      price: priceOffer.price,
      previousPrice: priceOffer.previousPrice,
    });
  }

  const groupsByOrganizations = _.groupBy(priceOffers, 'organization.id');

  const groups: IProductPriceOfferGroup[] = [];
  Object.keys(groupsByOrganizations).forEach(organizationId => {
    const organization = organizations.find(el => el.id === organizationId);
    const groupPriceOffers = groupsByOrganizations[organizationId];
    const groupPrices = groupPriceOffers.map(priceOffer => priceOffer.price);

    groups.push({
      organization: {
        id: organization.id,
        name: getOrgName(organization, true, true),
        inn: organization.inn,
      },
      productName: product?.pureName || product.name_ru,
      productAmount: groupPriceOffers.map(priceOffer => priceOffer.productAmount).reduce((a, b) => a + b, 0),
      minPrice: Math.min(...groupPrices),
      children: groupPriceOffers,
    });
  });

  return groups;
};
