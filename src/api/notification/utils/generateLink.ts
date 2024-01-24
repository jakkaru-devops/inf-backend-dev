import { CLIENT_APP_URL } from '../../../config/env';

const WEB_APP_URLS = {
  chat: chatId => `${CLIENT_APP_URL}/?openChat=true&chatId=${chatId}`,
  requestNotification: requestsId => `${CLIENT_APP_URL}/requests/${requestsId}?history=personal-area&history=requests`,
  orderNotification: requestsId => `${CLIENT_APP_URL}/orders/${requestsId}?history=personal-area&history=orders`,
  sellerPersonalAreaNotification: () => `${CLIENT_APP_URL}/personal-area?history=personal-area`,
  organizationPersonalAreaNotification: () =>
    `${CLIENT_APP_URL}/personal-area/settings?history=personal-area&tab=organizations`,
  newSellerReviewNotification: () => `${CLIENT_APP_URL}/personal-area/settings?history=personal-area&tab=reviews`,
  sellerAndUserPersonalAreaSettingNotification: () => `${CLIENT_APP_URL}/personal-area/settings?history=personal-area`,
  productOfferAcceptedAndRejectedNotification: () =>
    `${CLIENT_APP_URL}/product-offers?history=personal-area&history=product-offers`,
};

export default WEB_APP_URLS;
