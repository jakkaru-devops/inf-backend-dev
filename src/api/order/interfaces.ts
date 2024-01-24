import FileModel from '../files/models/File.model';

export interface IDescribedProductData {
  description: string;
  fileIds: FileModel['id'][];
  autoBrands: Array<{
    autoTypeId: string;
    autoBrandId: string;
  }>;
  productGroupIds: string[];
}

export interface IRequestProduct {
  productId?: string;
  requestedProductId?: string;
  newProduct?: {
    article: string;
    name: string;
    manufacturer: string;
  };
  describedProductData?: IDescribedProductData;
  quantity: number;
  count: number;
  requestedQuantity?: number;
  unitPrice?: number;
  deliveryQuantity?: number;
  deliveryTerm?: number;
  orderId?: string;
  productCategoryId?: string;
  orderRequestId?: string;
  organizationId?: string;
  altName?: string;
  altManufacturer?: string;
  altArticle?: string;
  isSelected?: boolean;
}

export interface IOrderRequestDocData {
  defaultCssStyle: string;
  idOrder: string;
  date: string;
  customerName: string;
  deliveryAddress: string;
  comment: string;
  describedProduct?: {
    categories: string;
    quantity: string;
    description: string;
  };
  sellerRegion?: string;
  selectedSellers?: string;
  displayProducts?: boolean;
  offerSent?: boolean;
  products?: Array<{
    index: number;
    name: string;
    article: string;
    manufacturer: string;
    requestedQuantity: number;
    offeredQuantity?: number;
    unitPrice?: number;
    deliveryQuantity?: number;
    deliveryTerm?: number;
    totalPrice?: number;
    cash?: number;
  }>;
  total?: {
    requestedQuantity: number;
    offeredQuantity: number;
    price: number;
    cash: number;
    comission: number;
    earn: number;
  };
  paidSum: number;
}

export interface IOrderDocData {
  defaultCssStyle: string;
  idOrder: string;
  date: string;
  customerName: string;
  deliveryAddress: string;
  comment: string;
  order: {
    products: Array<{
      index: number;
      name: string;
      article: string;
      manufacturer: string;
      quantity: number;
      totalPrice: number;
    }>;
    productsQuantity: number;
    totalPrice: number;
  };
  offers: Array<{
    index: number;
    seller: {
      name: string;
      rating: number;
      stars: boolean[];
      reviewsNumber: number;
      salesNumber: number;
    };
    products: Array<{
      index: number;
      name: string;
      article: string;
      manufacturer: string;
      requestedQuantity: number;
      unitPrice: number;
      offeredQuantity: number | string;
      deliveryQuantity: number | string;
      deliveryTerm: string;
      totalPrice: number;
      refundStatus: string;
    }>;
    total: {
      requestedQuantity: number;
      price: number;
      comission: number;
      earn: number;
    };
    deliveryOption: string;
    trackNumber: string;
    departureDate: string;
    receivingDate: string;
    hasNds: boolean;
    organizationName: string;
  }>;
}

export interface IOrderDocSellerData {
  defaultCssStyle: string;
  idOrder: string;
  date: string;
  customerName: string;
  payerName: string;
  deliveryAddress: string;
  comment: string;
  products: Array<{
    index: number;
    name: string;
    article: string;
    manufacturer: string;
    requestedQuantity: number;
    unitPrice: number;
    offeredQuantity: number | string;
    deliveryQuantity: number | string;
    deliveryTerm: string;
    totalPrice: number;
    refundStatus: string;
  }>;
  total: {
    requestedQuantity: number;
    price: number;
    comission: number;
    earn: number;
    cash: number;
  };
  deliveryOption: string;
  trackNumber: string;
  departureDate: string;
  receivingDate: string;
  hasNds: boolean;
  organizationName: string;
  organizationComission: number;
}

// export interface IOrderRequestDocDataSeller {
//   defaultCssStyle: string;
//   idOrder: string;
//   date: string;
//   customerName: string;
//   deliveryAddress: string;
//   comment: string;
//   describedProduct?: {
//     categories: string;
//     quantity: string;
//     description: string;
//   };
//   displayProducts?: boolean;
//   products?: Array<{
//     index: number;
//     name: string;
//     article: string;
//     manufacturer: string;
//     requestedQuantity: number;
//     offeredQuantity: number;
//   }>;
// }
