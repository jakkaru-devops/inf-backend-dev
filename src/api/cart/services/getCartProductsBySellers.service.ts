import _ from 'lodash';
import { getUserName } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import { ICartProductBasic } from '../../catalog/interfaces';
import Product from '../../catalog/models/Product.model';
import StockBalance from '../../catalog/models/StockBalance.model';
import Warehouse from '../../catalog/models/Warehouse.model';
import Organization from '../../organization/models/Organization.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import { getOrgName } from '../../organization/utils';
import User from '../../user/models/User.model';
import UserReview from '../../user/models/UserReview.model';
import { Sale } from '../../catalog/models/Sale.model';
import { PostponedPayment } from '../../order/models/PostponedPayment.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';

interface IProps {
  cartProductsBasic: ICartProductBasic[];
}

interface ICartOfferBasic {
  warehouseId: Warehouse['id'];
  products: Array<{
    priceOfferId: StockBalance['id'];
    productId: Product['id'];
    quantity: number;
    isSelected: boolean;
    deliveryMethod: string;
  }>;
}

interface ICartOffer {
  seller: {
    id: User['id'];
    fullName: string;
    firstName: string;
    lastName: string;
    middleName: string;
    ratingValue: number;
    reviewsNumber: number;
    salesNumber: number;
  };
  organization: {
    id: Organization['id'];
    name: string;
    inn: string;
    address: Address;
    hasNds: boolean;
  };
  warehouse: {
    id: Warehouse['id'];
  };
  products: ICartOfferProduct[];
  deliveryMethod: string;
  totalPrice?: number;
  postponedPayment?: {
    id: PostponedPayment['id'];
    customerId: User['id'];
    customerOrganizationId: JuristicSubject['id'];
    status: PostponedPayment['status'];
    daysRequested: number;
    daysApproved: number;
    maxSum: number;
  };
}

interface ICartOfferProduct {
  priceOfferId: StockBalance['id'];
  product: Product;
  unitPrice: number;
  availabledAmount: number;
  quantity: number;
  isSelected: boolean;
  sale?: Sale;
}

export const getCartProductBySellersService = async ({ cartProductsBasic }: IProps) => {
  const allProducts = (
    await Product.findAll({
      where: {
        id: cartProductsBasic.map(item => item.productId),
      },
    })
  ).map(el => el.toJSON() as Product);
  const allPriceOffers = (
    await StockBalance.findAll({
      where: {
        id: cartProductsBasic.map(item => item.priceOfferId),
      },
    })
  ).map(el => el.toJSON() as StockBalance);
  const allSales = (
    await Sale.findAll({
      where: {
        priceOfferId: allPriceOffers.filter(el => el.forSale).map(el => el.id),
      },
    })
  ).map(el => el.toJSON() as Sale);
  const allWarehouses = (
    await Warehouse.findAll({
      where: {
        id: _.uniq(allPriceOffers.map(item => item.warehouseId)),
      },
    })
  ).map(el => el.toJSON() as Warehouse);
  const allSellers = (
    await User.findAll({
      where: {
        id: allWarehouses.map(item => item.sellerId),
      },
      attributes: ['id', 'firstname', 'lastname', 'middlename', 'ratingValue'],
    })
  ).map(el => el.toJSON() as User);
  const allOrganizations = (
    await Organization.findAll({
      where: {
        id: allWarehouses.map(item => item.organizationId),
      },
    })
  ).map(el => el.toJSON() as Organization);
  const postponedPayments = (
    await PostponedPayment.findAll({
      where: {
        warehouseId: allWarehouses.map(item => item.id),
      },
    })
  ).map(el => el.toJSON() as PostponedPayment);

  const offersBasic: ICartOfferBasic[] = [];
  for (const cartProduct of cartProductsBasic) {
    const priceOffer = allPriceOffers.find(el => el.id === cartProduct.priceOfferId);
    if (!priceOffer) continue;

    const warehouse = allWarehouses.find(el => el.id === priceOffer.warehouseId);
    let offer = offersBasic.find(el => el.warehouseId === warehouse.id);

    if (!offer) {
      offer = {
        warehouseId: warehouse.id,
        products: [
          {
            priceOfferId: cartProduct.priceOfferId,
            productId: cartProduct.productId,
            quantity: cartProduct.quantity,
            isSelected: cartProduct.isSelected,
            deliveryMethod: cartProduct.deliveryMethod,
          },
        ],
      };
      offersBasic.push(offer);
    } else {
      offer.products.push({
        priceOfferId: cartProduct.priceOfferId,
        productId: cartProduct.productId,
        quantity: cartProduct.quantity,
        isSelected: cartProduct.isSelected,
        deliveryMethod: cartProduct.deliveryMethod,
      });
    }
  }

  const offers: ICartOffer[] = [];
  for (const offerBasic of offersBasic) {
    const warehouse = allWarehouses.find(el => el.id === offerBasic.warehouseId);
    const seller = allSellers.find(el => el.id === warehouse.sellerId);
    const organization = allOrganizations.find(el => el.id === warehouse.organizationId);
    const postponedPayment = postponedPayments?.find(el => el?.warehouseId === warehouse.id);
    const offerProducts: ICartOfferProduct[] = [];

    for (const productBasic of offerBasic.products) {
      let product = allProducts.find(el => el.id === productBasic.productId);
      const sale = allSales.find(el => el.priceOfferId === productBasic.priceOfferId);

      if (!!product) {
        product = {
          ...product,
          name: product.name_ru,
        } as any;

        const stockBalance = allPriceOffers.find(el => el.id === productBasic.priceOfferId);

        offerProducts.push({
          priceOfferId: productBasic.priceOfferId,
          product,
          unitPrice: stockBalance.price,
          availabledAmount: stockBalance?.amount,
          quantity: productBasic.quantity,
          isSelected: productBasic.isSelected,
          sale,
        });
      }
    }

    if (!seller || !organization || !offerProducts.filter(el => !!el.availabledAmount).length) continue;

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

    offers.push({
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
      organization: {
        id: organization.id,
        name: getOrgName(organization, true, true),
        inn: organization.inn,
        address,
        hasNds: organization.hasNds,
      },
      warehouse: {
        id: warehouse.id,
      },
      products: offerProducts,
      deliveryMethod: offerBasic.products[0]?.deliveryMethod,
      postponedPayment: !!postponedPayment
        ? {
            id: postponedPayment.id,
            customerId: postponedPayment.customerId,
            customerOrganizationId: postponedPayment.customerOrganizationId,
            status: postponedPayment.status,
            daysRequested: postponedPayment.daysRequested,
            daysApproved: postponedPayment.daysApproved,
            maxSum: postponedPayment.maxSum,
          }
        : null,
    });
  }

  return offers;
};
