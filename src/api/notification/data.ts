import { ENotificationType, INotificationModule } from './interfaces';

export const NOTIFICATION_MODULES: { [key in INotificationModule]: string[] } = {
  orderRequests: [
    'createOrderRequest',
    'offerToOrderRequest',
    'offerExpired',
    'requestToUpdateOffer',
    'offerUpdated',
    'orderPartialPayment',
    'requestPaymentRefund',
    'paymentRefundRequestPaid',
    'orderInvoicePaymentApproved',
  ],
  orders: [
    'orderInvoicePaymentConfirmed',
    'offerInvoicePaymentConfirmed',
    'orderPaid',
    'orderInvoicePaymentCanceled',
    'offerInvoicePaymentCanceled',
    'orderPaymentPostponed',
    'receiptCreated',
    'applicationChangeTransportCompany',
    'approvedChangeTransportCompany',
    'declinedChangeTransportCompany',
  ],
  orderHistory: ['orderShipped', 'orderBack', 'rewardPaid', 'refundProductComplete', 'exchangeProductComplete'],
  refunds: [
    'refundProductRequest',
    'refundProductAccept',
    'refundProductDecline',
    'exchangeProductRequest',
    'exchangeProductAccept',
    'exchangeProductDecline',
  ],
  organizations: [], // not needed
  userComplaints: ['newUserComplaint'],
  customers: ['customerRegistered'],
  sellers: ['sellerUpdateApplicationCreated'],
  productOffers: ['productOfferCreated', 'productOfferUpdated', 'productOfferAccepted', 'productOfferRejected'],
  messenger: [],
};

export const generateHtmlNotification = (result: string, link: string) => {
  const html = `
    <p>У вас новое уведомление на площадке inf.market.</p>
    <p>${result}, <a href="${link}" style="color: red;">смотреть</a></p>
  `;
  return html;
};
