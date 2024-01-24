export type IUserRoleOption = 'customer' | 'seller' | 'manager' | 'operator' | 'moderator' | 'superadmin';

export const PermissionsEnum = [
  'favouriteProductsAvailable',
  'cartAvailable',
  'offersAvailable',
  'refundAvailable',
  'personalDataAvailable',
  'chatAvailable', // is everywhere ?
  'supportChatsAvailable',
  'readReviewAvailable',
  'writeComplainAvailable',
  'writeReviewAvailable',
  'manageSellerDataAvailable',
  'manageRefundAvailable',
  'organizationsAvailable',
  'sellerDataAvailable',
  'requestProductChangeAvailable',
  'manageDigitizationAvailable',
  'readComplainAvailable',
  'selectCategoriesAvailable',
  'manageAllSellerDataAvailable',
  'manageAllRefundAvailable',
  'moderateOrganizationsAvailable',
  'moderateProductChangeAvailable',
  'moderateSellerDataAvailable',
  'moderateDigitizationAvailable',
  'moderateComplainAvailable',
  'manageCategoriesAvailable',
  'manageAdminsAvailable',
  'manageRolesAvailable',
  'banAvailable',
  'manageEmployees',

  // Orders
  'exploreAllOrderRequestsAvailable', // M
  'requestOrdersPlusHistoryAvailable', // C
  'manageOrderRequestsAvailable', // C, M
  'exploreOrderRequestsAndOrdersAvailable', // C, S, M
  'suggestOrdersAvailable', // S
  'payOrderSellerFee',

  // Transport Companies
  'transportСompanyAvailable',
  'manageTransportСompanyAvailable',

  // Other
  'inspectUsersInfoAvailable',
  'rewardsAvailable',
];

// export type PermissionsType = typeof PermissionsEnum

// После регистрации через телефон сразу имеет доступ ко всем возможностям
// покупателя
// Добавить товар в закладки
// Посмотреть список закладок
// Добавить товар из закладок в корзину
// Добавить товар в корзину
// Посмотреть корзину
// Сделать запрос из корзины
// Сделать запрос по фото или описанию товара
// Посмотреть список своих запросов
// Посмотреть свой запрос
// Посмотреть предложения на свой запрос
// Выбрать товары из предложений и сформировать заказ с выбранными товарами (каждый заказ может содержать сделки с несколькими продавцами)
// Указать персональные данные при оформлении первого заказа (то есть когда
// персональные данные еще не указаны)
// Зарегистрировать организацию (ИП, ООО, ПАО) для оформления сделки через нее
// Оплатить заказ
// Выбрать транспортную компанию для доставки товаров из заказа
// Посмотреть свой заказ на любой его стадии
// Связаться с продавцом из заказа через чат
// Оставить отзыв с рейтингом после завершения заказа (каждому из продавцов в
// заказе)
// Оформить возврат товара или товаров
// Выбрать регионы и/или города для отправки запросов (продавцы только из этих городов и регионов будут видеть запрос от этого покупателя)
// Редактировать телефон и email
// Посмотреть карточку продавца. Вкладки:
// a. Информация. Полностью все данные, кроме прикрепленных продавцом (при регистрации) файлов
// b. Отзывы. На этой странице отзывы можно только смотреть.
// c. Транспортные компании

// После регистрации через телефон сразу должен пройти более подробную регистрацию в 3 этапа:
//  a. Ввод ИНН организации, на которую работает. Если организация с таким ИНН уже зарегана в системе, может добавить только филиал организации, к которому и будет прикреплен. Если организация с введенным ИНН еще не зарегана, сам вводит полные ее реквизиты.
// b. Ввод личных данных и выбор категорий товаров которые продает. Отправляет заявку на расширенную регистрацию
// c. Ожидает подтверждения или отказа в регистрации от менеджера. В случае отказа, исправляет ошибку и отправляет заявку на расширенную регистрацию повторно
// Добавить товар в закладки
// Просмотреть список закладок
// Посмотреть список запросов. Видит только запросы, в которых есть хотя бы один товар, из выбранных продавцом категорий.
// Посмотреть запрос и отправить предложение на него
// Связаться с покупателем через чат со страницы запроса или заказа
// Посмотреть список заказов (там запросы на которые продавец отправил
// предложение и заказы - то есть покупатель заказал хотя бы один товар из
// предложения продавца)
// Посмотреть свою карточку. Вкладки:
// a. Список организаций, к которым продавец прикреплен
// b. Личные данные. Оттуда же может отправить заявку на смену данных.
// c. Посмотреть отзывы на себя
// d. Транспортные компании. Там же выбирает с какими из них сотрудничать
// Посмотреть свои личные данные
// Отправить заявку на смену личных данных
// Предложить товар на оцифровку. То есть продавец предлагает товар для занесения в каталог (модератор проверяет)
// Посмотреть список своих предложений для оцифровки
// Посмотреть карточку покупателя. Только вкладка “Информация”

// Посмотреть список всех заказов
// Посмотреть заказ и курировать его
// Посмотреть список всех покупателей
// Посмотреть карточку покупателя. Вкладки:
// a. Личные данные. Там же может редактировать его данные
// b. Жалобы. Там же может связаться через чат и с продавцом, который оставил жалобу, и с покупателем, на которого пришла жалоба. Принять меры (заблокировать на время, удалить)
// c. Организации покупателя
// Посмотреть список продавцов
// Посмотреть карточку продавца. Вкладки:
// a. Организации, к которым продавец прикреплен
// b. Личные данные. Там же может отредактировать данные продавца
// c. Отзывы
// d. Транспортные компании
// e. Жалобы. Там же может связаться через чат и с покупателем, который оставил жалобу, и с продавцом, на которого пришла жалоба. Принять меры (заблокировать на время, удалить)
// Также на карточке продавца может разблокировать его.
// Посмотреть список организаций, к которым прикрепляются продавцы (там и
// одобренные и новые - неподтвержденные)
// Посмотреть карточку организации или заявку на ее регистрацию. Зарегистрировать или отправить отказ
// Посмотреть карточку продавца из организации или заявку на его регистрацию в эту организацию. Зарегистрировать или отправить отказ

// Посмотреть и отредактировать типы категорий и категории товаров
// Редактировать товары
// Посмотреть список оцифрованных товаров
// Принять или отклонить оцифрованный товар

// Посмотреть список сотрудников
// Добавить, заблокировать на время, удалить сотрудника
