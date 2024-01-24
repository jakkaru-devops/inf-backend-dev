import { Request } from 'express';
import axios from 'axios';
import { IEntityId, ILocale, RandomCodeType } from '../interfaces/common.interfaces';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import passwordGenerator from 'generate-password';
import FormData from 'form-data';
import User from '../api/user/models/User.model';
import _ from 'lodash';
import { Model } from 'sequelize-typescript';
import { DEFAULT_USER_LANGUAGE_LABEL, EXTERNAL_PORT, PORT, PROTOCOL } from '../config/env';
import { LANGUAGES } from '../api/language/data';
import CyrillicToTranslit from 'cyrillic-to-translit-js';
import seq, { Op } from 'sequelize';

export function getRandomIntInclusive(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateNumberCode(length: number): string {
  let result = '';

  for (let i = 0; i < length; i++) {
    // result += (i + 1).toString()
    result += getRandomIntInclusive(0, 9).toString();
  }

  return result;
}

export function formatPhoneNumber(phoneNumber: string): string {
  if (typeof phoneNumber !== 'string') phoneNumber = String(phoneNumber);
  const parsedNumber = parsePhoneNumberFromString(phoneNumber, 'RU');
  if (parsedNumber && parsedNumber.number.length) return parsedNumber.number.toString();
  else return null;
}

/**
 * Convert User model to full username string
 * @param user
 */
export function getUserName(user: User, format?: 'full' | 'fl' | 'lf' | 'firstname' | 'lastname', strict?: boolean) {
  format = format || 'full';

  if (!!user?.firstname && !!user?.lastname) {
    switch (format) {
      case 'full':
        return `${user.lastname} ${user.firstname}${!!user.middlename ? ` ${user.middlename}` : ''}`;
      case 'fl':
        return `${user.firstname} ${user.lastname}`;
      case 'lf':
        return `${user.lastname} ${user.firstname}`;
      case 'firstname':
        return `${user.firstname}`;
      case 'lastname':
        return `${user.lastname}`;
      default:
        return 'Имя не определено';
    }
  } else {
    if (!strict && user?.phone) {
      return user?.phone !== 'hidden' ? formatPhoneNumber(user.phone) : `Покупатель №${user.idInt}`;
    } else return null;
  }
}

/**
 * Converts address to string
 * @param address
 * @param format
 */
export const convertAddressToString = (address: any, format: 'full' | 'region/city' = 'full') => {
  address = {
    country: address.country || 'Россия',
    region: address.region,
    area: address.area,
    city: address?.city === address?.settlement ? null : address.city,
    settlement: address.settlement,
    street: address.street,
    building: address.building,
    apartment: address.apartment,
  };

  const addressArr: string[] = [];

  (format == 'region/city' ? ['region', 'city'] : Object.keys(address)).forEach(key => {
    const value = address[key] as string;
    if (value) {
      if (key === 'settlement') {
        addressArr.push(value);
      } else {
        if (!address.settlement || !address.settlement.includes(value)) {
          addressArr.push(value);
        }
      }
    }
  });

  return addressArr.join(', ');
};

/**
 * Function for declension of numbers
 * @param {number} num
 * @param {any} locales
 */
export const declOfNum = (num: number, locales: any) =>
  locales[num % 100 > 4 && num % 100 < 20 ? 2 : [2, 0, 1, 1, 1, 2][num % 10 < 5 ? Math.abs(num) % 10 : 5]];

/**
 * Convert milliseconds to mdhm format
 * @param {number} milliseconds
 */
export const millisecondsToMdhm = (ms: number) => {
  const months = Math.floor(ms / (31 * 24 * 60 * 60 * 1000));
  const days = Math.floor((ms % (31 * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  const mdhm = [];

  months > 0 && mdhm.push(months + ' ' + declOfNum(months, ['месяц', 'месяца', 'месяцев']));
  days > 0 && mdhm.push(days + ' ' + declOfNum(days, ['день', 'дня', 'дней']));
  hours > 0 && mdhm.push(hours + ' ' + declOfNum(hours, ['час', 'часа', 'часов']));
  minutes > 0 && mdhm.push(minutes + ' ' + declOfNum(minutes, ['минута', 'минуты', 'минут']));

  return mdhm.join(' ');
};

export const callToPhone = async ({
  phone,
  code,
}: {
  phone: string;
  text?: string;
  code?: string;
}): Promise<boolean> => {
  phone = phone.replace('+', '');

  const login = 'info@inf.market';
  const apiKey = 'Zj79rqI2aM8OhX3clCSKuwggs';

  let result = await axios.get(`https://${login}:${apiKey}@gate.smsaero.ru/v2/flashcall/send`, {
    params: {
      phone,
      code,
    },
  });
  console.log('CALL RESULT', result?.data || 'Error');
  if (!!result && result?.status === 200) return true;
  return false;
};

export const sendSmsToPhone = async ({ phone, text }: { phone: string; text?: string }): Promise<boolean> => {
  phone = phone.replace('+', '');

  const login = 'info@inf.market';
  const apiKey = 'Zj79rqI2aM8OhX3clCSKuwggs';

  let result = await axios.get(`https://${login}:${apiKey}@gate.smsaero.ru/v2/sms/send`, {
    params: {
      sign: 'SMS Aero',
      number: phone,
      text,
    },
  });
  console.log('SMS RESULT', result?.data || 'Error');
  if (!!result && result?.status === 200) return true;
  return false;
};

/**
 * Generates random password
 * @param length Length of the password
 */
export function generateRandomCode({
  length,
  numbers = true,
  symbols = true,
  lowercase = true,
  uppercase = true,
  excludeSimilarCharacters = true,
}: RandomCodeType) {
  return passwordGenerator.generate({
    length,
    numbers,
    symbols,
    lowercase,
    uppercase,
    excludeSimilarCharacters,
  });
}

export const filterObject = (obj: any, excludeValue: any) => {
  Object.keys(obj).forEach((key, i) => {
    if (obj[key] === excludeValue) delete obj[key];
  });
  return obj;
};

/**
 *  Converts Object to FormData
 *  @param data
 */
export const toFormData = (data: object) => {
  const formData = new FormData();
  Object.keys(data).forEach(key => formData.append(key, data[key]));
  return formData;
};

export const subInfoPdfContent = [
  {
    text: 'Настоящий Счет-договор является письменным предложением Поставщика Покупателю заклю-',
    x: 30,
  },
  {
    text: 'чить договор поставки товара (далее –– Договор) на изложенных ниже условиях:',
    x: 20,
  },
  {
    text: '1.    Предмет, количество и стоимость товара и условия доставки указаны в Счет-договоре.',
    x: 24,
  },
  {
    text: '2.    Договор считается заключенным (акцепт оферты) с момента оплаты Счет-договора Покупате-',
    x: 24,
  },
  {
    text: '       лем, а именно с даты зачисления денежных средств на расчетный счет Администратора. Непол-',
    x: 24,
  },
  {
    text: '       ная оплата Счет-договора не является акцептом, если иное не указано в Счет-договоре.',
    x: 24,
  },
  {
    text: '3.    Способ доставки товара:',
    x: 24,
  },
  {
    text: '3.1.   Покупатель должен осуществить выборку товара со склада/магазина Поставщика в течение 3',
    x: 27,
  },
  {
    text: '(трех) дней с момента получения уведомления о готовности товара.',
    x: 36,
  },
  {
    text: '3.2.   Отгрузка транспортной компанией - силами поставщика или покупателя.',
    x: 27,
  },
  {
    text: 'Способ доставки указывается покупателем при оформлении заказа на Сервисе.',
    x: 36,
  },
  {
    text: '4.    Приемка товара:',
    x: 24,
  },
  {
    text: '4.1.   При приемке товара Покупатель обязан проверить:',
    x: 27,
  },
  {
    text: '4.1.1.   количество и ассортимент товара на соответствие Счет-договору;',
    x: 30,
  },
  {
    text: '4.1.2.   комплектность и качество товара;',
    x: 30,
  },
  {
    text: '4.1.3.   отсутствие внешних повреждений упаковки и товара;',
    x: 30,
  },
  {
    text: '4.1.4.   наличие необходимой документации. ',
    x: 30,
  },
  {
    text: '4.2.   Покупатель, принимая товар и расписываясь в накладной, подтверждает, что:',
    x: 27,
  },
  {
    text: '4.2.1.   характеристики полученного товара соответствуют Счет-договору, принято товара по',
    x: 30,
  },
  {
    text: 'количеству мест, указанных в накладной;',
    x: 42,
  },
  {
    text: '4.2.2.   Поставщик полностью выполнил обязательства по отгрузке товара надлежащего качества,',
    x: 30,
  },
  {
    text: 'ассортимента, комплектности и передачи документации к товару. ',
    x: 42,
  },
  {
    text: '5.    Администратор не несет ответственность за качество товара, действия Поставщика при доставке',
    x: 24,
  },
  {
    text: 'товара. Все претензии Покупатель направляет напрямую Поставщику.',
    x: 31,
  },
  {
    text: '6.    Счет-договор действителен в течение 3 (трех) календарных дней. В случае просрочки оплаты Сче-',
    x: 24,
  },
  {
    text: 'та Покупателем Поставщик вправе вернуть денежные средства и отказаться от исполнения',
    x: 31,
  },
  {
    text: 'обязательств, указанных в Счете.',
    x: 31,
  },
  {
    text: '7.    Все, что не урегулировано Счет-договором, подлежит разрешению в соответствии с Правилами',
    x: 24,
  },
  {
    text: 'заключения договора поставки и законодательством РФ.',
    x: 31,
  },
];
/**
 * Round the number
 * @param {number} num
 */
export const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

export const tranformObjectKeysToSnakeCase = (obj: Object): any => {
  if (typeof obj !== 'object') return obj;
  const result = JSON.parse(JSON.stringify(obj));

  Object.keys(result).forEach(key => {
    result[key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)] = result[key];
    delete result[key];
  });

  return result;
};

export const transformObjectKeysToCamelCase = (obj: Object): any => {
  return _.mapKeys(obj, (v, k) => _.camelCase(k));
};

/**
 * @param entity
 * @param userLanguage
 * @param params
 * @returns Entity with added "name" and "desc" fields
 */
export const transformEntityLocale = (entity: Model, params?: { saveOriginal?: boolean }) => {
  if (!entity) return null;

  if (!!entity.get) {
    entity = entity.toJSON() as any;
  }

  for (const field of ['name', 'description']) {
    for (const lang of LANGUAGES) {
      if (typeof entity[`${field}_${lang.label}`] === 'undefined') continue;

      if (!entity[field]) {
        entity[field] = entity[`${field}_${DEFAULT_USER_LANGUAGE_LABEL}`] as string;
      }

      if (!params?.saveOriginal) {
        delete entity[`${field}_${lang.label}`];
      }
    }
  }

  return entity as any;
};

/**
 * Define limit and offset to get paginated list of entities
 * @param query
 * @param defaultLimit
 * @returns
 */
export const getPaginationParams = (query: any, defaultLimit?: number) => {
  if (query?.pageSize === 'all') {
    return {
      offset: Number(query?.offset || 0),
    };
  }

  const limit = defaultLimit !== null ? Number(query.pageSize) || defaultLimit || 10 : null;
  const offset = Number(query?.offset) || limit * ((Number(query.page) || 1) - 1);

  return {
    limit,
    offset,
  };
};

const cyrillicToTranslit = new (CyrillicToTranslit as any)();

export const generateLabel = (string: string): string => {
  return cyrillicToTranslit.transform(string, '_').toLowerCase();
};

export const transformObjectKeysCase = (obj: object, transformAction: 'camelCase' | 'toUpper' | 'toLower') =>
  _.mapKeys(obj, (__, k) => _[transformAction](k));

export const padZero = (num: number, len?: number) => {
  len = len || 2;
  const zeros = new Array(len).join('0');
  return (zeros + num).slice(-len);
};

export const gaussRound = (num: number, len: number) => {
  if (typeof num !== 'number') return num;
  let d = len || 0,
    m = Math.pow(10, d),
    n = +(d ? num * m : num).toFixed(8),
    i = Math.floor(n),
    f = n - i,
    e = 1e-8,
    r = f > 0.5 - e && f < 0.5 + e ? (i % 2 == 0 ? i : i + 1) : Math.round(n);

  return d ? r / m : r;
};

export const validateLocales = (
  locales: ILocale[],
  errors: {
    language: (lang: string) => string;
    name: (name: string, lang: string) => string;
    defaultLanguage: (lang: string) => string;
  },
) => {
  for (const locale of locales) {
    if (!LANGUAGES.map(({ label }) => label).includes(locale.language)) {
      throw new Error(errors.language(locale?.language));
    }
    if (!(locale.name || '').trim().length) {
      throw new Error(errors.name(locale?.name, locale?.language));
    }
  }
  if (!locales.find(locale => locale.language === DEFAULT_USER_LANGUAGE_LABEL)) {
    throw new Error(errors.defaultLanguage(DEFAULT_USER_LANGUAGE_LABEL));
  }
};

export const generateLocales = ({
  locales,
  name,
  description,
}: {
  locales: ILocale[];
  name: string;
  description?: string;
}) => {
  if (!locales) {
    locales = [{ language: DEFAULT_USER_LANGUAGE_LABEL, name, description }];
  }
  return locales;
};

export const transformLocalesToModelData = ({
  locales,
  name,
  description,
}: {
  locales: ILocale[];
  name: string;
  description?: string;
}) => {
  locales = generateLocales({ locales, name, description });
  const definedLocales: { [key: string]: string } = {};
  for (const locale of locales) {
    if (locale.name) definedLocales[`name_${locale.language}`] = locale.name;
    if (locale.description) definedLocales[`description_${locale.language}`] = locale.description;
  }
  return definedLocales;
};

export const separateNumberBy = (num: number | string, delimiter: string) =>
  num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, delimiter);

export const getMonthBorders = (m: number, y?: number): [Date, Date] => {
  y = y || new Date().getFullYear();

  return [new Date(y, m - 1, 1), new Date(y, m, 0)]; // months starts from 0
};

export const getMonthFilter = (m?: number, y?: number, attribute = 'completionDate'): seq.FindAndCountOptions => {
  if (!m) return { where: {} };

  const [startOfMonth, endOfMonth] = getMonthBorders(m, y);

  return {
    where: {
      [attribute]: {
        [Op.and]: {
          [Op.gte]: startOfMonth,
          [Op.lte]: endOfMonth,
        },
      },
    },
  };
};

export const calculateNds = (num: number) => {
  return num - num / 1.2;
};

export const getServerUrl = (req: Request) =>
  `${PROTOCOL?.toLowerCase() || req.protocol}://${req.hostname}${
    !['80', '443'].includes(EXTERNAL_PORT || PORT) ? `:${EXTERNAL_PORT || PORT}` : ''
  }`;

export const stripString = (str: string) => {
  if (!str) return null;
  return str.replace(/(<([^>]+)>)/gi, '');
};

export const replaceAll = (str: string, searchValue: string, replaceValue: string) => {
  return (str as string).replace(new RegExp(searchValue, 'g'), replaceValue);
};

export const validateEmail = (email: string): boolean => {
  return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/.test(email);
};

/**
 * Removes all special symbols, spaces on the sides from string and transforms it to lower case
 */
export const simplifyStr = (str: string) =>
  str
    .trim()
    .replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '')
    .toLowerCase()
    .replaceAll('ё', 'е');

/**
 * Removes all special symbols, spaces on the sides from string and transforms it to lower case
 */
export const simplifySearchQuery = simplifyStr;

/**
 * Unifying multiple items filter param to get array of string or null
 */
export const handleFilterParam = (param: IEntityId | IEntityId[]): IEntityId[] | null => {
  if (!param) return null;
  if (typeof param === 'string' || typeof param === 'number') param = [param];
  param = param.filter(value => !!String(value)?.trim()?.length && value !== 'undefined');
  if (!param?.length) return null;
  return param;
};

/**
 * Returns stringified value to use as a filter value
 */
export const getFilterItemValue = (id: IEntityId) => {
  return `${id}`;
};

export const simplifyHtml = (str: string) =>
  str?.trim()?.replace(/<(?!br|p|\/p|table|\/table|tr|\/tr|th|\/th|td|\/td\s*\/?)[^>]+>/g, '') || null;

export const entityToJSON = <T>(entity: any) => {
  return (!!entity?.get ? entity?.toJSON() : entity) as T;
};
