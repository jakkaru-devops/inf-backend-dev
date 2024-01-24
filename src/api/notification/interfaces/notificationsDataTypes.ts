import ProductOffer from '../../catalog/models/ProductOffer.model';
import Order from '../../order/models/Order.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import Organization from '../../organization/models/Organization.model';
import { IUserRoleOption } from '../../role/interfaces';
import UserRoles from '../../role/models/UserRoles.model';
import Complaint from '../../user/models/Complaint.model';
import User from '../../user/models/User.model';

interface IUserRoleItem {
  id: string;
  label: IUserRoleOption;
  bannedUntil?: string;
  requestsBannedUntil?: string;
}

export interface INotificationDataType {
  dummy: {};
  offerToOrderRequest: {
    orderRequestId: OrderRequest['id'];
    idOrder: OrderRequest['idOrder'];
    seller: User;
  };
  createOrderRequest: {
    customerId: User['id'];
    customer?: User;
    orderRequestId: OrderRequest['id'];
    idOrder: OrderRequest['idOrder'];
  };
  offerExpired: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  requestToUpdateOffer: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  offerUpdated: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  orderShipped: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  orderPartialPayment: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    totalPrice: OrderRequest['totalPrice'];
    paidSum: OrderRequest['paidSum'];
  };
  requestPaymentRefund: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    paidSum: OrderRequest['paidSum'];
  };
  paymentRefundRequestPaid: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    refundSum: number;
  };
  orderPaid: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  receiptCreated: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  orderCompleted: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  orderBack: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  rewardPaid: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  refundProductRequest: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  refundProductAccept: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  refundProductDecline: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  refundProductComplete: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  exchangeProductRequest: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  exchangeProductAccept: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  exchangeProductDecline: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  exchangeProductComplete: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    orderId: Order['id'];
  };
  userRoleBanned: {
    roles: IUserRoleItem[];
    allRoles: boolean;
    reasons: Complaint['reason'];
  };
  userRoleUnbanned: {
    roles: IUserRoleItem[];
    allRoles: boolean;
  };
  userOrderRequestsBanned: {
    roles: IUserRoleItem[];
    reasons: Complaint['reason'];
  };
  userOrderRequestsUnbanned: {
    roles: IUserRoleItem[];
  };
  sellerDowngraded: {
    reasons: UserRoles['bannedReason'];
  };
  newSellerReview: {
    review: {
      receiverId: User['id'];
      ratingValue: number;
    };
  };
  newUserComplaint: {
    complaint: {
      defendantId: User['id'];
      defendantRoleId: UserRoles['id'];
      defendantRoleLabel: IUserRoleOption;
      defendantName: string;
    };
  };
  sellerUpdateApplicationCreated: {
    seller: {
      id: string;
      name: string;
    };
    applicationId: string;
  };
  sellerUpdateApplicationConfirmed: {
    seller: {
      id: string;
      name: string;
    };
    applicationId: string;
  };
  sellerUpdateApplicationRejected: {
    seller: {
      id: string;
      name: string;
    };
    applicationId: string;
  };
  registerOrganizationApplication: {
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  registerOrganizationApplicationUpdated: {
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  registerSellerApplication: {
    seller: {
      userId: User['id'];
      name: string;
    };
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  registerSellerApplicationUpdated: {
    seller: {
      userId: User['id'];
      name: string;
    };
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  organizationRegisterConfirmed: {
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  organizationRegisterRejected: {
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  organizationSellerRegisterConfirmed: {
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  organizationSellerRegisterRejected: {
    organization: {
      id: Organization['id'];
      name: string;
    };
  };
  organizationUpdateApplicationCreated: {
    organization: {
      id: Organization['id'];
      name: string;
    };
    applicationId: string;
    user: {
      id: string;
      name: string;
    };
  };
  organizationUpdateApplicationConfirmed: {
    organization: {
      id: Organization['id'];
      name: string;
    };
    applicationId: string;
  };
  organizationUpdateApplicationRejected: {
    organization: {
      id: Organization['id'];
      name: string;
    };
    applicationId: string;
  };
  productOfferCreated: {
    productOffer: {
      id: ProductOffer['id'];
      productName: string;
    };
  };
  productOfferUpdated: {
    productOffer: {
      id: ProductOffer['id'];
      productName: string;
    };
  };
  productOfferAccepted: {
    productOffer: {
      id: ProductOffer['id'];
      productName: string;
    };
  };
  productOfferRejected: {
    productOffer: {
      id: ProductOffer['id'];
      productName: string;
    };
  };
  orderInvoicePaymentApproved: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  orderInvoicePaymentConfirmed: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  offerInvoicePaymentConfirmed: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    offerId: Order['id'];
    supplierName: string;
  };
  offerInvoicePaymentCanceled: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    offerId: Order['id'];
    supplierName: string;
  };
  orderInvoicePaymentCanceled: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
  };
  orderAttachmentUploaded: {
    orderRequestId: OrderRequest['id'];
    idOrder: OrderRequest['idOrder'];
    attachmentGroup: 'attachment' | 'invoice' | 'accountingDocument' | 'acceptanceCertificate' | 'waybill' | 'check';
  };
  applicationChangeTransportCompany: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    seller?: User;
  };
  approvedChangeTransportCompany: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    customerId: User['id'];
    customer?: User;
  };
  declinedChangeTransportCompany: {
    idOrder: OrderRequest['idOrder'];
    orderRequestId: OrderRequest['id'];
    customerId: User['id'];
    customer?: User;
  };
  customerRegistered: {
    user: {
      id: string;
      phone: string;
    };
  };
}
