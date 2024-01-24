import 'reflect-metadata';
import { Sequelize } from 'sequelize-typescript';
import { DB_NAME, DB_USERNAME, DB_PASSWORD, DB_HOST, DB_PORT, DB_LOGS } from './env';

import Organization from '../api/organization/models/Organization.model';
import FavoriteProduct from '../api/catalog/models/FavoriteProduct.model';
import Product from '../api/catalog/models/Product.model';
import DeliveryAddress from '../api/address/models/DeliveryAddress.model';
import User from '../api/user/models/User.model';
import FileModel from '../api/files/models/File.model';
import Chat from '../api/messenger/models/Chat.model';
import ChatMember from '../api/messenger/models/ChatMember.model';
import ChatMessage from '../api/messenger/models/ChatMessage.model';
import ChatMessageFile from '../api/messenger/models/ChatMessageFile.model';
import ChatMessageView from '../api/messenger/models/ChatMessageView.model';
import ProductFile from '../api/catalog/models/ProductFile.model';
import Address from '../api/address/models/Address.model';
import ProductOffer from '../api/catalog/models/ProductOffer.model';
import Language from '../api/language/models/Language.model';
import OrganizationBranch from '../api/organization/models/OrganizationBranch.model';
import OrganizationSeller from '../api/organization/models/OrganizationSeller.model';
import OrganizationRejection from '../api/organization/models/OrganizationRejection.model';
import OrganizationFile from '../api/organization/models/OrganizationFile.model';
import OrganizationSellerRejection from '../api/organization/models/OrganizationSellerRejection.model';
import JuristicSubject from '../api/user/models/JuristicSubject.model';
import Requisites from '../api/user/models/Requisites.model';
import Role from '../api/role/models/Role.model';
import UserRoles from '../api/role/models/UserRoles.model';
import CustomerRegisterFile from '../api/files/models/CustomerRegisterFile.model';
import SellerRegisterFile from '../api/files/models/SellerRegisterFile.model';
import RequestProduct from '../api/order/models/RequestProduct.model';
import Order from '../api/order/models/Order.model';
import OrderRequest from '../api/order/models/OrderRequest.model';
import Region from '../api/regions/models/Region.model';
import SelectedRegions from '../api/regions/models/SelectedRegions.model';
import SelectedSettlements from '../api/regions/models/SelectedSettlements.model';
import Settlement from '../api/regions/models/Settlement.model';
import SettlementType from '../api/regions/models/SettlementType.model';
import TransportCompany from '../api/shipping/models/TransportCompany';
import SellerTransportCompany from '../api/user/models/SellerTransportCompany.model';
import DescribedProduct from '../api/catalog/models/DescribedProduct.model';
import DescribedProductFile from '../api/catalog/models/DescribedProductFile.model';
import OrderRequestFile from '../api/order/models/OrderRequestFile.model';
import Complaint from '../api/user/models/Complaint.model';
import ComplaintFile from '../api/user/models/ComplaintFile.model';
import UserReview from '../api/user/models/UserReview.model';
import ProductAnalogs from '../api/catalog/models/ProductAnalogs.model';
import Reward from '../api/order/models/Reward.model';
import RefundExchangeRequest from '../api/order/models/RefundExchangeRequest.model';
import RefundExchangeRequestFile from '../api/order/models/RefundExchangeRequestFile.model';
import Notification from '../api/notification/models/Notification.model';
import AutoType from '../api/catalog/models/AutoType.model';
import AutoTypeBrandRelations from '../api/catalog/models/relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from '../api/catalog/models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../api/catalog/models/relations/AutoBrandGroupRelations.model';
import ProductAutoTypeRelations from '../api/catalog/models/relations/ProductAutoTypeRelations.model';
import AutoBrand from '../api/catalog/models/AutoBrand.model';
import ProductAutoBrandRelations from '../api/catalog/models/relations/ProductAutoBrandRelations.model';
import AutoModel from '../api/catalog/models/AutoModel.model';
import ProductAutoModelRelations from '../api/catalog/models/relations/ProductAutoModelRelations.model';
import CatalogSection from '../api/catalog/models/CatalogSection.model';
import ProductSectionRelations from '../api/catalog/models/relations/ProductSectionRelations.model';
import ProductGroup from '../api/catalog/models/ProductGroup.model';
import ProductGroupRelations from '../api/catalog/models/relations/ProductGroupRelations.model';
import SellerAutoBrands from '../api/catalog/models/relations/SellerAutoBrands.model';
import CartProduct from '../api/cart/models/CartProduct.model';
import PaymentRefundRequest from '../api/order/models/PaymentRefundRequest.model';
import ProductApplicability from '../api/catalog/models/ProductApplicability.model';
import RecommendedProducts from '../api/catalog/models/RecommendedProducts.model';
import ReasonToRejectShippingCondition from '../api/order/models/reasonToRejectShippingCondition.model';
import SellerUpdateApplication from '../api/user/models/SellerUpdateApplication.model';
import SellerUpdateApplicationFile from '../api/user/models/SellerUpdateApplicationFile.model';
import OrganizationUpdateApplication from '../api/organization/models/OrganizationUpdateApplication.model';
import OrganizationUpdateApplicationBranch from '../api/organization/models/OrganizationUpdateApplicationBranch.model';
import OrganizationUpdateApplicationFile from '../api/organization/models/OrganizationUpdateApplicationFile.model';
import SellerProductGroups from '../api/catalog/models/relations/SellerProductGroups.model';
import OrderRequestSellerData from '../api/order/models/OrderRequestSellerData.model';
import DescribedProductAutoBrands from '../api/catalog/models/DescribedProductAutoBrands.model';
import ProductBranch from '../api/catalog/models/ProductBranch.model';
import DeviceToken from '../api/user/models/DeviceToken.model';
import CustomerContract from '../api/user/models/CustomerContract.model';
import CustomerContractSpecification from '../api/user/models/CustomerContractSpecification.model';
import JuristicSubjectCustomer from '../api/user/models/JuristicSubjectCustomer.model';
import AuthAttempt from '../api/auth/models/AuthAttempt.model';
import AuthPhoneBlock from '../api/auth/models/AuthPhoneBlock.model';
import AuthBannedIP from '../api/auth/models/AuthBannedIP.model';
import Warehouse from '../api/catalog/models/Warehouse.model';
import StockBalance from '../api/catalog/models/StockBalance.model';
import Sales from '../api/catalog/models/Sales.model';
import ExternalCatalogRequest from '../api/catalogExternal/models/ExternalCatalogRequest.model';
import ExternalCatalogBannedIP from '../api/catalogExternal/models/ExternalCatalogBannedIP.model';
import { PricedProductReservation } from '../api/catalog/models/PricedProductReservation.model';
import { Sale } from '../api/catalog/models/Sale.model';
import { PostponedPayment } from '../api/order/models/PostponedPayment.model';

const mainDBConnection = new Sequelize(DB_NAME, DB_USERNAME, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'postgres',
  logging: DB_LOGS,
  models: [
    // regions
    Region,
    SelectedRegions,
    SelectedSettlements,
    Settlement,
    SettlementType,
    // languages
    Language,
    // auth
    AuthAttempt,
    AuthPhoneBlock,
    AuthBannedIP,
    // users
    User,
    JuristicSubject,
    JuristicSubjectCustomer,
    Requisites,
    Role,
    UserRoles,
    CustomerRegisterFile,
    SellerRegisterFile,
    SellerTransportCompany,
    UserReview,
    SellerUpdateApplication,
    SellerUpdateApplicationFile,
    DeviceToken,
    CustomerContract,
    CustomerContractSpecification,
    // complaint
    Complaint,
    ComplaintFile,
    // organizations
    Organization,
    OrganizationBranch,
    OrganizationRejection,
    OrganizationSeller,
    OrganizationSellerRejection,
    OrganizationFile,
    OrganizationUpdateApplication,
    OrganizationUpdateApplicationBranch,
    OrganizationUpdateApplicationFile,
    // for customers
    DeliveryAddress,
    // orders
    Order,
    OrderRequest,
    OrderRequestFile,
    OrderRequestSellerData,
    Reward,
    PaymentRefundRequest,
    ReasonToRejectShippingCondition,
    PostponedPayment,
    // products
    Product,
    ProductBranch,
    ProductAnalogs,
    DescribedProduct,
    DescribedProductAutoBrands,
    FavoriteProduct,
    CartProduct,
    ProductFile,
    DescribedProductFile,
    ProductOffer,
    RequestProduct,
    RefundExchangeRequest,
    RefundExchangeRequestFile,
    ProductApplicability,
    RecommendedProducts,
    Sale,
    // product categories
    CatalogSection,
    ProductSectionRelations,
    AutoType,
    ProductAutoTypeRelations,
    AutoBrand,
    AutoTypeBrandRelations,
    AutoTypeGroupRelations,
    AutoBrandGroupRelations,
    ProductAutoBrandRelations,
    AutoModel,
    ProductAutoModelRelations,
    ProductGroup,
    ProductGroupRelations,
    SellerAutoBrands,
    SellerProductGroups,
    // sales
    Warehouse,
    StockBalance,
    Sales,
    PricedProductReservation,
    // addresses
    Address,
    // files
    FileModel,
    // shipping
    TransportCompany,
    // messenger
    Chat,
    ChatMember,
    ChatMessage,
    ChatMessageView,
    ChatMessageFile,
    // notifications
    Notification,
    // external catalogs
    ExternalCatalogRequest,
    ExternalCatalogBannedIP,
  ],

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export default mainDBConnection;
