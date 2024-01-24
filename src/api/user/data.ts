import { IUserRoleOption } from '../role/interfaces';

export const EMPLOYEE_ROLES: IUserRoleOption[] = ['manager', 'operator', 'moderator'];
export const CLIENT_ROLES: IUserRoleOption[] = ['customer', 'seller'];
export const USER_ROLE_NAMES: { [key in IUserRoleOption]: string } = {
  customer: 'Покупатель',
  seller: 'Продавец',
  operator: 'Оператор',
  manager: 'Менеджер',
  moderator: 'Модератор',
  superadmin: 'Администратор',
};

export const USER_REVIEW_STATUSES = {
  DEFAULT: 100, // Added by customer
  PRODUCT_OFFER: 200, // Added automatically when moderator accepts ProductOffer
};

export const SELLER_TYPES = {
  INDIVIDUAL: 100,
  SELF_EMPLOYED: 200,
  IP: 300,
};

export const COMPLAINT_REASON_NAMES = {
  spam: 'Рассылка спама',
  behaviour: 'Оскорбительное поведение',
  fraud: 'Мошенничество',
  nonobservance: 'Несоблюдение условий договора',
};
