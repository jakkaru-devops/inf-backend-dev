import Organization from '../../organization/models/Organization.model';
import User from '../../user/models/User.model';
import DescribedProduct from '../models/DescribedProduct.model';
import Product from '../models/Product.model';
import StockBalance from '../models/StockBalance.model';
import Warehouse from '../models/Warehouse.model';

export interface IProduct extends Product {
  name: string;
  description: string;
  preview: string;
}

export interface IDescribedProduct extends DescribedProduct {
  preview: string;
  attachments: IAttachment[];
}

export interface ICartProductBasic {
  productId: string;
  quantity: number;
  priceOfferId?: StockBalance['id'];
  isSelected?: boolean;
  deliveryMethod?: string;
  createdAt: string;
}

export interface ICartProduct extends ICartProductBasic {
  product?: Product;
}

export interface IAttachment {
  group?: string;
  name: string;
  ext: string;
  url: string;
}

export type IGetProductIncludes =
  | 'allCategories'
  | 'catalogSections'
  | 'autoTypes'
  | 'autoBrands'
  | 'autoModels'
  | 'groups'
  | 'files';

export interface IProductPriceOffer {
  id: number;
  organization: {
    id: Organization['id'];
    name: string;
    inn: string;
  };
  address: {
    settlement: string;
  };
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
  warehouse: {
    id: string;
  };
  productName: string;
  manufacturer: string;
  productAmount: number;
  price: number;
  previousPrice: number;
  quantity?: number;
}

export interface IProductPriceOfferGroup {
  organization: {
    id: Organization['id'];
    name: string;
    inn: string;
  };
  productName: string;
  productAmount: number;
  minPrice: number;
  children: IProductPriceOffer[];
}
