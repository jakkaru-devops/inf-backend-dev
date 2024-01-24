import Order from '../../order/models/Order.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import PaymentRefundRequest from '../../order/models/PaymentRefundRequest.model';
import User from '../../user/models/User.model';

export interface IOfferToOrderRequestData {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
  seller: User;
}

export interface ICreateOrderRequestData {
  customerId: OrderRequest['customerId'];
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
}

export interface IOfferExpiredOrUpdated {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
}

export interface IOrderPartialPaymentData {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
  totalPrice: OrderRequest['totalPrice'];
  paidSum: OrderRequest['paidSum'];
}

export interface IOfferPaymentConfirmed {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
  offerId: Order['id'];
  supplierName: string;
}

export interface IRequestPaymentRefundData {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
  paidSum: OrderRequest['paidSum'];
}

export interface IPaymentRefundRequestPaidData {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
  refundSum: PaymentRefundRequest['refundSum'];
}

export interface IRefundExchange {
  orderRequestId: OrderRequest['id'];
  idOrder: OrderRequest['idOrder'];
  orderId: Order['id'];
}
export interface IChangedTransportCompany {
  idOrder: OrderRequest['idOrder'];
  orderRequestId: OrderRequest['id'];
  seller?: User;
  customerId?: User['id'];
}

export type NotificationData =
  | IOfferToOrderRequestData
  | ICreateOrderRequestData
  | IOfferExpiredOrUpdated
  | IOrderPartialPaymentData
  | IRequestPaymentRefundData
  | IPaymentRefundRequestPaidData
  | IRefundExchange
  | IChangedTransportCompany
  | IOfferPaymentConfirmed;

export enum ENotificationType {
  dummy = 'dummy',
  // User
  userRoleBanned = 'userRoleBanned',
  userRoleUnbanned = 'userRoleUnbanned',
  userOrderRequestsBanned = 'userOrderRequestsBanned',
  userOrderRequestsUnbanned = 'userOrderRequestsUnbanned',
  newSellerReview = 'newSellerReview',
  newUserComplaint = 'newUserComplaint',
  sellerUpdateApplicationCreated = 'sellerUpdateApplicationCreated',
  sellerUpdateApplicationConfirmed = 'sellerUpdateApplicationConfirmed',
  sellerUpdateApplicationRejected = 'sellerUpdateApplicationRejected',
  sellerDowngraded = 'sellerDowngraded',
  customerRegistered = 'customerRegistered',
  // Organization
  registerOrganizationApplication = 'registerOrganizationApplication',
  registerOrganizationApplicationUpdated = 'registerOrganizationApplicationUpdated',
  registerSellerApplication = 'registerSellerApplication',
  registerSellerApplicationUpdated = 'registerSellerApplicationUpdated',
  organizationRegisterConfirmed = 'organizationRegisterConfirmed',
  organizationRegisterRejected = 'organizationRegisterRejected',
  organizationSellerRegisterConfirmed = 'organizationSellerRegisterConfirmed',
  organizationSellerRegisterRejected = 'organizationSellerRegisterRejected',
  organizationUpdateApplicationCreated = 'organizationUpdateApplicationCreated',
  organizationUpdateApplicationConfirmed = 'organizationUpdateApplicationConfirmed',
  organizationUpdateApplicationRejected = 'organizationUpdateApplicationRejected',
  // Catalog
  productOfferCreated = 'productOfferCreated',
  productOfferUpdated = 'productOfferUpdated',
  productOfferAccepted = 'productOfferAccepted',
  productOfferRejected = 'productOfferRejected',
  // Orders
  createOrderRequest = 'createOrderRequest',
  offerToOrderRequest = 'offerToOrderRequest',
  offerExpired = 'offerExpired',
  requestToUpdateOffer = 'requestToUpdateOffer',
  offerUpdated = 'offerUpdated',
  orderPartialPayment = 'orderPartialPayment',
  requestPaymentRefund = 'requestPaymentRefund',
  paymentRefundRequestPaid = 'paymentRefundRequestPaid',
  orderInvoicePaymentApproved = 'orderInvoicePaymentApproved',
  orderInvoicePaymentConfirmed = 'orderInvoicePaymentConfirmed',
  offerInvoicePaymentConfirmed = 'offerInvoicePaymentConfirmed',
  orderAttachmentUploaded = 'orderAttachmentUploaded',
  orderPaid = 'orderPaid',
  orderInvoicePaymentCanceled = 'orderInvoicePaymentCanceled',
  offerInvoicePaymentCanceled = 'offerInvoicePaymentCanceled',
  orderPaymentPostponed = 'orderPaymentPostponed',
  receiptCreated = 'receiptCreated',
  orderShipped = 'orderShipped',
  orderCompleted = 'orderCompleted',
  orderBack = 'orderBack',
  rewardPaid = 'rewardPaid',
  refundProductRequest = 'refundProductRequest',
  refundProductAccept = 'refundProductAccept',
  refundProductDecline = 'refundProductDecline',
  refundProductComplete = 'refundProductComplete',
  exchangeProductRequest = 'exchangeProductRequest',
  exchangeProductAccept = 'exchangeProductAccept',
  exchangeProductDecline = 'exchangeProductDecline',
  exchangeProductComplete = 'exchangeProductComplete',
  applicationChangeTransportCompany = 'applicationChangeTransportCompany',
  approvedChangeTransportCompany = 'approvedChangeTransportCompany',
  declinedChangeTransportCompany = 'declinedChangeTransportCompany',
}

export type INotificationModule =
  | 'orderRequests'
  | 'orders'
  | 'orderHistory'
  | 'refunds'
  | 'organizations'
  | 'userComplaints'
  | 'customers'
  | 'sellers'
  | 'productOffers'
  | 'messenger';
