import { ORG_ENTITY_TYPES } from '../data';
import { IOrganization } from '../interfaces';
import Organization from '../models/Organization.model';

export const getOrgStatus = (org: Organization): IOrganization['status'] => {
  if (!!org.confirmationDate) {
    const unconfirmedSellersCount = org.sellers.filter(seller => !seller.confirmationDate).length;

    if (!!org.bannedUntil) {
      return {
        label: 'BANNED',
        name: 'Заблокирована',
      };
    }
    if (unconfirmedSellersCount > 0) {
      return {
        label: 'SELLER_CONFIRMATION',
        name: 'Запрос на регистрацию продавца',
      };
    }

    if (!!org.updateApplications?.length) {
      return {
        label: 'UPDATE_APPLICATION',
        name: 'Запрос на обновление данных',
      };
    }

    if (!!org?.sellers?.find(seller => seller?.user?.sellerUpdateApplication)) {
      return {
        label: 'SELLER_UPDATE_APPLICATION',
        name: 'Запрос на обновление продавца',
      };
    }

    return {
      label: 'CONFIRMED',
      name: 'Зарегистрирована',
    };
  } else {
    if (org.rejections.length > 0) {
      return {
        label: 'ORG_REJECTED',
        name: 'Отказ в регистрации',
      };
    } else {
      return {
        label: 'ORG_CONFIRMATION',
        name: 'Запрос на регистрацию',
      };
    }
  }
};

/**
 * Returns formatted organization name
 * @param org
 */
export const getOrgName = (
  org: { name: Organization['name']; entityCode?: Organization['entityCode'] },
  addOrgType: boolean,
  addQuotes: boolean,
) => {
  try {
    const orgEntityTypeStr = org.entityCode
      ? ORG_ENTITY_TYPES.find(({ code }) => code === org.entityCode)?.name?.short
      : ORG_ENTITY_TYPES.find(({ name }) => name.short && org.name.toUpperCase().indexOf(`${name.short} `) === 0)?.name
          ?.short;

    if (orgEntityTypeStr === 'ИП') {
      // if org entity type is defined in our json
      if (orgEntityTypeStr) {
        let name = org.name.split('"').join('').trim();
        if (addOrgType) {
          if (name.toUpperCase().indexOf(`${orgEntityTypeStr} `) === 0)
            name = name
              .split('')
              .filter((_, i) => i > orgEntityTypeStr.length)
              .join('');
          return `${orgEntityTypeStr !== name.toUpperCase() ? `${orgEntityTypeStr} ` : ''}${
            addQuotes && orgEntityTypeStr !== 'ИП' ? `"${name}"` : name
          }`;
        }
        if (!addOrgType && name.toUpperCase().indexOf(`${orgEntityTypeStr} `) === 0)
          return name.replace(`${orgEntityTypeStr} `, '');
      }

      return org.name.trim().split('"').join('');
    }

    return org?.name || null;
  } catch (err) {
    return null;
  }
};

export const getOrganizationComission = (org: Organization) => {
  if (!!org?.priceBenefitPercentAcquiring && !!org?.priceBenefitPercentInvoice) {
    return {
      priceBenefitPercent: null,
      priceBenefitPercentAcquiring: org?.priceBenefitPercentAcquiring,
      priceBenefitPercentInvoice: org?.priceBenefitPercentInvoice,
    };
  } else {
    return {
      priceBenefitPercent: org?.priceBenefitPercent,
      priceBenefitPercentAcquiring: null,
      priceBenefitPercentInvoice: null,
    };
  }
};
