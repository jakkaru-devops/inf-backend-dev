import { formatPhoneNumber, gaussRound } from '../../../utils/common.utils';
import { COMPLAINT_REASON_NAMES, USER_ROLE_NAMES } from '../../user/data';
import WEB_APP_URLS from '../utils/generateLink';
import { INotificationDataType } from '../interfaces/notificationsDataTypes';
import Notification from '../models/Notification.model';
import User from '../../user/models/User.model';
import { generateHtmlNotification } from '../data';

export const defineNotificationContent = (notification: Notification, userData?: User) => {
  const type = notification.type;
  const data = !!notification?.data
    ? typeof notification?.data === 'string'
      ? JSON.parse(notification.data)
      : notification.data || {}
    : {};
  let result = { type: notification.type, text: null as string, data: JSON.stringify(data), message: null as any };

  if (!notification || notification?.type === 'dummy') null;
  if (type === 'offerToOrderRequest') {
    const { idOrder, orderRequestId } = data as INotificationDataType['offerToOrderRequest'];
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.text = `На запрос ${idOrder} получено предложение`;
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'createOrderRequest') {
    const { idOrder, orderRequestId } = data as INotificationDataType['createOrderRequest'];
    result.text = `Поступил запрос ${idOrder}`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'orderPartialPayment') {
    const { idOrder, orderRequestId } = data as INotificationDataType['orderPartialPayment'];
    result.text = `Запрос ${idOrder} оплачен не полностью`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'applicationChangeTransportCompany') {
    const { idOrder, orderRequestId } = data as INotificationDataType['applicationChangeTransportCompany'];
    result.text = `По запросу ${idOrder} поступила заявка на изменение условий доставки`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'approvedChangeTransportCompany') {
    const { idOrder, orderRequestId } = data as INotificationDataType['approvedChangeTransportCompany'];
    result.text = `По запросу ${idOrder} одобрены изменения по условиям доставки`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'declinedChangeTransportCompany') {
    const { idOrder, orderRequestId } = data as INotificationDataType['declinedChangeTransportCompany'];
    result.text = `По запросу ${idOrder} отклонены изменения по условиям доставки`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'requestPaymentRefund') {
    const { idOrder, paidSum } = data as INotificationDataType['requestPaymentRefund'];
    result.text = `Запрос ${idOrder}. Запрос на возврат денежных средств (${paidSum} ₽)`; // Manager
    return result;
  }
  if (type === 'paymentRefundRequestPaid') {
    const { idOrder, refundSum, orderRequestId } = data as INotificationDataType['paymentRefundRequestPaid'];
    result.text = `По запросу ${idOrder} произведен возврат денежных средств (${refundSum} ₽)`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'offerExpired') {
    const { idOrder, orderRequestId } = data as INotificationDataType['offerExpired'];
    result.text = `Истек срок предложения на запрос ${idOrder}`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'requestToUpdateOffer') {
    const { idOrder, orderRequestId } = data as INotificationDataType['requestToUpdateOffer'];
    result.text = `Запрос на обновление предложения ${idOrder}`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'offerUpdated') {
    const { idOrder, orderRequestId } = data as INotificationDataType['offerUpdated'];
    result.text = `Предложение обновлено`;
    const link = WEB_APP_URLS.requestNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text} ${idOrder}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'orderShipped') {
    const { idOrder, orderRequestId } = data as INotificationDataType['orderShipped'];
    result.text = `Заказ ${idOrder} отгружен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'orderPaid') {
    const { idOrder, orderRequestId } = data as INotificationDataType['orderPaid'];
    result.text = `Заказ ${idOrder} оплачен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'orderCompleted') {
    const { idOrder, orderRequestId } = data as INotificationDataType['orderCompleted'];
    result.text = `Заказ ${idOrder} завершён`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'orderBack') {
    const { idOrder } = data as INotificationDataType['orderBack'];
    result.text = `Заказ ${idOrder} снова в работе`;
    return result;
  }
  if (type === 'rewardPaid') {
    const { idOrder, orderRequestId } = data as INotificationDataType['rewardPaid'];
    result.text = `Вознаграждение по заказу ${idOrder} выплачено`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'refundProductRequest') {
    const { idOrder, orderRequestId } = data as INotificationDataType['refundProductRequest'];
    result.text = `Запрос на возврат в заказе ${idOrder}`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'refundProductAccept') {
    const { idOrder, orderRequestId } = data as INotificationDataType['refundProductAccept'];
    result.text = `Возврат в заказе ${idOrder} одобрен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'refundProductDecline') {
    const { idOrder, orderRequestId } = data as INotificationDataType['refundProductDecline'];
    result.text = `Возврат в заказе ${idOrder} отклонен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'refundProductComplete') {
    const { idOrder, orderRequestId } = data as INotificationDataType['refundProductComplete'];
    result.text = `Возврат в заказе ${idOrder} завершен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'exchangeProductRequest') {
    const { idOrder, orderRequestId } = data as INotificationDataType['exchangeProductRequest'];
    result.text = `Запрос на обмен в заказе ${idOrder}`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'exchangeProductAccept') {
    const { idOrder, orderRequestId } = data as INotificationDataType['exchangeProductAccept'];
    result.text = `Обмен в заказе ${idOrder} одобрен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'exchangeProductDecline') {
    const { idOrder, orderRequestId } = data as INotificationDataType['exchangeProductDecline'];
    result.text = `Обмен в заказе ${idOrder} отклонен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'exchangeProductComplete') {
    const { idOrder, orderRequestId } = data as INotificationDataType['exchangeProductComplete'];
    result.text = `Обмен в заказе ${idOrder} завершен`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'userRoleBanned') {
    const { roles, allRoles, reasons } = data as INotificationDataType['userRoleBanned'];
    result.text = allRoles
      ? `Ваш аккаунт заблокирован`
      : roles?.length === 1
      ? `Ваша роль ${USER_ROLE_NAMES[roles[0].label]} заблокирована`
      : `Ваши роли ${roles.map(role => USER_ROLE_NAMES[role.label]).join(', ')} заблокированы`;
    if (reasons) result.text += `. Причина: ${reasons.map(reason => COMPLAINT_REASON_NAMES[reason]).join(', ')}`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'userRoleUnbanned') {
    const { roles, allRoles } = data as INotificationDataType['userRoleUnbanned'];
    result.text = allRoles
      ? `Ваш аккаунт разблокирован`
      : roles?.length === 1
      ? `Ваша роль ${USER_ROLE_NAMES[roles[0].label]} разблокирована`
      : `Ваши роли ${roles.map(role => USER_ROLE_NAMES[role.label]).join(', ')} разблокированы`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'userOrderRequestsBanned') {
    const { reasons } = data as INotificationDataType['userOrderRequestsBanned'];
    result.text = `Для Вас заблокированы запросы. Причина: ${reasons
      .map(reason => COMPLAINT_REASON_NAMES[reason])
      .join(', ')}`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'userOrderRequestsUnbanned') {
    result.text = `Запросы разблокированы`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'sellerDowngraded') {
    const { reasons } = data as INotificationDataType['sellerDowngraded'];
    result.text = `Ваш рейтинг понижен. Причина: ${reasons.map(reason => COMPLAINT_REASON_NAMES[reason]).join(', ')}`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'newSellerReview') {
    const { review } = data as INotificationDataType['newSellerReview'];
    result.text = `Новый отзыв. Ваш рейтинг - ${gaussRound(review.ratingValue, 2)}`;
    const link = WEB_APP_URLS.newSellerReviewNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'newUserComplaint') {
    const { complaint } = data as INotificationDataType['newUserComplaint'];
    result.text = `Новая жалоба на `;
    if (complaint.defendantRoleLabel === 'customer') result.text += 'покупателя';
    else if (complaint.defendantRoleLabel === 'seller') result.text += 'продавца';
    return result; // Manager
  }

  if (type === 'sellerUpdateApplicationCreated') {
    result.text = `Запрос на обновление личных данных продавца`; // Manager
    return result;
  }
  if (type === 'sellerUpdateApplicationConfirmed') {
    result.text = `Обновление Ваших личных данных одобрено`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'sellerUpdateApplicationRejected') {
    result.text = `Запрос на обновление Ваших личных данных отклонен`;
    const link = WEB_APP_URLS.sellerAndUserPersonalAreaSettingNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'registerOrganizationApplication') {
    result.text = `Заявка на регистрацию организации`;
    return result;
  }
  if (type === 'registerOrganizationApplicationUpdated') {
    result.text = `Заявка на регистрацию организации обновлена`;
    return result;
  }
  if (type === 'registerSellerApplication') {
    result.text = `Заявка на регистрацию продавца`;
    return result;
  }
  if (type === 'registerSellerApplicationUpdated') {
    result.text = `Заявка на регистрацию продавца обновлена`;
    return result;
  }
  if (type === 'organizationRegisterConfirmed') {
    const { organization } = data as INotificationDataType['organizationRegisterConfirmed'];
    result.text = `Регистрация организации ${organization.name} подтверждена`;
    const link = WEB_APP_URLS.organizationPersonalAreaNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'organizationRegisterRejected') {
    const { organization } = data as INotificationDataType['organizationRegisterRejected'];
    result.text = `Регистрация организации ${organization.name} отклонена`;
    const link = WEB_APP_URLS.organizationPersonalAreaNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'organizationSellerRegisterConfirmed') {
    result.text = `Регистрация подтверждена`;
    const link = WEB_APP_URLS.sellerPersonalAreaNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'organizationSellerRegisterRejected') {
    result.text = `Регистрация отклонена`;
    const link = WEB_APP_URLS.sellerPersonalAreaNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }

  if (type === 'organizationUpdateApplicationCreated') {
    const { organization } = data as INotificationDataType['organizationUpdateApplicationCreated']; // Manager
    result.text = `Запрос на обновление данных организации ${organization.name}`;
    return result;
  }
  if (type === 'organizationUpdateApplicationConfirmed') {
    const { organization } = data as INotificationDataType['organizationUpdateApplicationConfirmed'];
    result.text = `Обновление данных организации ${organization.name} одобрено`;
    const link = WEB_APP_URLS.organizationPersonalAreaNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'organizationUpdateApplicationRejected') {
    const { organization } = data as INotificationDataType['organizationUpdateApplicationRejected'];
    result.text = `Запрос на обновление данных организации ${organization.name} отклонен`;
    const link = WEB_APP_URLS.organizationPersonalAreaNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'productOfferCreated') {
    result.text = `Новая заявка на оцифровку`;
    return result;
  }
  if (type === 'productOfferUpdated') {
    result.text = `Заявка на оцифровку обновлена`;
    return result;
  }
  if (type === 'productOfferAccepted') {
    result.text = `Заявка на оцифровку одобрена. Ваш рейтинг повышен`;
    const link = WEB_APP_URLS.productOfferAcceptedAndRejectedNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'productOfferRejected') {
    result.text = `Заявка на оцифровку отклонена`;
    const link = WEB_APP_URLS.productOfferAcceptedAndRejectedNotification();
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'orderInvoicePaymentApproved') {
    const { idOrder } = data as INotificationDataType['orderInvoicePaymentApproved'];
    result.text = `Покупатель начал оплату заказа ${idOrder} по счету`;
    return result;
  }
  if (type === 'orderInvoicePaymentConfirmed') {
    const { idOrder, orderRequestId } = data as INotificationDataType['orderInvoicePaymentConfirmed'];
    result.text = `Оплата заказа ${idOrder} подтверждена`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'orderAttachmentUploaded') {
    const { idOrder, orderRequestId } = data as INotificationDataType['orderAttachmentUploaded'];
    result.text = `К заказу ${idOrder} прикреплено вложение`;
    const link = WEB_APP_URLS.orderNotification(orderRequestId);
    result.message = {
      to: userData.emailNotification,
      subject: `Уведомление: ${result.text}`,
      html: generateHtmlNotification(result.text, link),
    };
    return result;
  }
  if (type === 'customerRegistered') {
    const { user } = data as INotificationDataType['customerRegistered'];
    result.text = `Зарегистрировался покупатель ${formatPhoneNumber(user.phone)}`;
    return result;
  }

  return null;
};
