import path from 'path';
import appRoot from 'app-root-path';
import { Duration } from 'date-fns';
import { IFrontendPlatform } from '../interfaces/common.interfaces';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'; // Payment systems are blocked without this parameter

export const ENV = (process.env.ENV || 'development') as 'development' | 'production';
export const PORT = process.env.PORT;
export const EXTERNAL_PORT = process.env.EXTERNAL_PORT;
export const PROTOCOL = (process.env?.PROTOCOL || 'http') as 'http' | 'https';
export const CLUSTER_MODE = [true, 'true'].includes(process.env?.CLUSTER_MODE) || false;
export const SEND_PUSH_NOTIFICATIONS = [true, 'true'].includes(process.env?.SEND_PUSH_NOTIFICATIONS) || false;

export const REDIS_URL = process.env.REDIS_URL;
export const CLIENT_APP_URL = process.env.CLIENT_APP_URL;
export const EXTERNAL_APP_URL = process.env.EXTERNAL_APP_URL as string;

export const DB_NAME = process.env.DB_NAME;
export const DB_USERNAME = process.env.DB_USERNAME;
export const DB_PASSWORD = process.env.DB_PASSWORD;
export const DB_HOST = process.env.DB_HOST;
export const DB_PORT = parseInt(process.env.DB_PORT);

export const DB_LOGS = [true, 'true'].includes(process.env?.DB_LOGS) || false;

export const EMAIL_ORDER_FOR_IMAP_SIMPLE = process.env.EMAIL_ORDER_FOR_IMAP_SIMPLE;
export const PASSWORD_ORDER_FOR_IMAP_SIMPLE = process.env.PASSWORD_ORDER_FOR_IMAP_SIMPLE;

export const JWT_SECRET = process.env.JWT_SECRET;
export const BCRYPT_SECRET = process.env.BCRYPT_SECRET;

export const DADATA_TOKEN = process.env.DADATA_TOKEN;

export const ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY;
export const TEST_ACCESS_KEY = process.env.TEST_ACCESS_KEY;

export const SMS_AUTHENTICATION_ENABLED = [true, 'true'].includes(process.env?.SMS_AUTHENTICATION_ENABLED);
export const TEST_SMS_CONFIRMATION_CODE = process.env.TEST_SMS_CONFIRMATION_CODE || '111111';

export const SECURED_BY_GOOGLE_RECAPTCHA = [true, 'true'].includes(process.env?.SECURED_BY_GOOGLE_RECAPTCHA);
export const GOOGLE_PROJECT_ID = process.env.GOOGLE_PROJECT_ID;
export const GOOGLE_RECAPTCHA_SECRET_KEYS: { [key in IFrontendPlatform]: string } = {
  web: process.env.GOOGLE_RECAPTCHA_SECRET_KEY_WEB,
  android: process.env.GOOGLE_RECAPTCHA_SECRET_KEY_ANDROID,
  ios: process.env.GOOGLE_RECAPTCHA_SECRET_KEY_IOS,
};

export const ALLOW_CREATING_CHAT_WITH_OFFER = false;
export const ALLOW_SENDING_MESSAGE_WITH_OFFER = false;

export const UPLOADS_DIRECTORY = path.join(appRoot + '/uploads');
export const UPLOAD_FILES_DIRECTORY = path.join(UPLOADS_DIRECTORY + '/files');
export const UPLOADS_DATE_FORMAT = 'dd-MM-yyyy';
export const UNKNOWN_UPLOAD_SECTION = 'unknown';
export const ORDERS_UPLOAD_SECTION = 'orders';
export const USERS_UPLOAD_SECTION = 'users';
export const ORGANIZATIONS_UPLOAD_SECTION = 'organizations';
export const PRODUCTS_UPLOAD_SECTION = 'products';

export const NODEMAILER_HOST = process.env.NODEMAILER_HOST;
export const NODEMAILER_PORT = parseInt(process.env.NODEMAILER_PORT);
export const NODEMAILER_EMAIL = process.env.NODEMAILER_EMAIL;
export const NODEMAILER_PASSWORD = process.env.NODEMAILER_PASSWORD;
export const NODEMAILER_SECURED = process.env?.NODEMAILER_SECURED === 'true';
export const NODEMAILER_SERVICE = process.env.NODEMAILER_SERVICE;

export const DEFAULT_USER_LANGUAGE_LABEL = 'ru';

export const PAYMENTS_ENABLED = [true, 'true'].includes(process.env?.PAYMENTS_ENABLED) || false;

export const SBERPAY_SERVER = process.env.SBERPAY_SERVER;
export const SBERPAY_USERNAME = process.env.SBERPAY_USERNAME;
export const SBERPAY_PASSWORD = process.env.SBERPAY_PASSWORD;

export const PAYKEEPER_SERVER = process.env.PAYKEEPER_SERVER;
export const PAYKEEPER_USERNAME = process.env.PAYKEEPER_USERNAME;
export const PAYKEEPER_PASSWORD = process.env.PAYKEEPER_PASSWORD;
export const PAYKEEPER_SECRET = process.env.PAYKEEPER_SECRET;

export const PSB_TERMINAL = process.env.PSB_TERMINAL;
export const PSB_MERCHANT = process.env.PSB_MERCHANT;
export const PSB_MERCH_NAME = process.env.PSB_MERCH_NAME;
export const PSB_KEY_COMPONENT_1 = process.env.PSB_KEY_COMPONENT_1;
export const PSB_KEY_COMPONENT_2 = process.env.PSB_KEY_COMPONENT_2;
export const PSB_SERVER = process.env.PSB_SERVER || 'https://test.3ds.payment.ru';
export const PSB_NOTIFY_URL = process.env.PSB_NOTIFY_URL;
export const PSB_MERCHANT_EMAIL = process.env.PSB_MERCHANT_EMAIL;

export const CHECK_ONLINE_ACCOUNT_URL = process.env.CHECK_ONLINE_ACCOUNT_URL;
export const CHECK_ONLINE_APP_ID = process.env.CHECK_ONLINE_APP_ID;
export const CHECK_ONLINE_SECRET_KEY = process.env.CHECK_ONLINE_SECRET_KEY;

export const ACAT_CATALOG_TOKEN = process.env.ACAT_CATALOG_TOKEN;
export const ACAT_MS_BASE_URL = process.env.ACAT_BASE_URL;

export const EXTERNAL_CATALOG_URL = process.env.EXTERNAL_CATALOG_URL;
export const LAXIMO_TRUCKS_BASE_URL = process.env.LAXIMO_TRUCKS_BASE_URL;
export const LAXIMO_CARS_BASE_URL = process.env.LAXIMO_CARS_BASE_URL;

export const RENEWAL_TIME: Duration = { days: 3 };

export const SELLER_OFFER_DOC_NAME = `Агентский договор`;

export default {
  ENV,
  PORT,
  EXTERNAL_PORT,
  CLIENT_APP_URL,
  DB_NAME,
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOST,
  DB_PORT,
  JWT_SECRET,
  BCRYPT_SECRET,
  DADATA_TOKEN,
  ADMIN_ACCESS_KEY,
  TEST_ACCESS_KEY,
  SMS_AUTHENTICATION_ENABLED,
  TEST_SMS_CONFIRMATION_CODE,
  ALLOW_CREATING_CHAT_WITH_OFFER,
  ALLOW_SENDING_MESSAGE_WITH_OFFER,
  UPLOADS_DIRECTORY,
  UPLOAD_FILES_DIRECTORY,
  UPLOADS_DATE_FORMAT,
  UNKNOWN_UPLOAD_SECTION,
  ORDERS_UPLOAD_SECTION,
  USERS_UPLOAD_SECTION,
  ORGANIZATIONS_UPLOAD_SECTION,
  NODEMAILER_EMAIL,
  NODEMAILER_PASSWORD,
  DEFAULT_USER_LANGUAGE_LABEL,
  PAYMENTS_ENABLED,
  PAYKEEPER_SERVER,
  PAYKEEPER_USERNAME,
  PAYKEEPER_PASSWORD,
  PAYKEEPER_SECRET,
  PSB_TERMINAL,
  PSB_MERCHANT,
  PSB_MERCH_NAME,
  PSB_KEY_COMPONENT_1,
  PSB_KEY_COMPONENT_2,
  PSB_SERVER,
  PSB_NOTIFY_URL,
  PSB_MERCHANT_EMAIL,
};
