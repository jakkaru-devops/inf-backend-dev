import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../../../config/env';
import { ILocale, IServiceResponse } from '../../../interfaces/common.interfaces';
import { APIError } from '../../../utils/api.utils';
import CatalogSection from '../models/CatalogSection.model';

interface IProps {
  label: string;
  locales: ILocale[];
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  catalogSection: CatalogSection;
}

export const createCatalogSectionService = async ({ label, locales, res, transaction }: IProps): Promise<IResult> => {
  try {
    // Filter locales
    locales = locales.filter(locale => locale.name && locale.name.trim().length > 0);
    if (!locales.find(locale => locale.language === DEFAULT_USER_LANGUAGE_LABEL)) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: `Требуется перевод для раздела каталога на стандартном языке - ${DEFAULT_USER_LANGUAGE_LABEL}`,
      });
    }

    const definedLocales = {};
    for (const locale of locales) {
      definedLocales[`name_${locale.language}`] = locale.name;
    }

    const [catalogSection] = await CatalogSection.findOrCreate({
      where: {
        label,
      },
      defaults: {
        label,
        ...definedLocales,
      },
      transaction,
    });

    return {
      catalogSection,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка. Раздел каталога не добавлен',
      error: err,
    });
  }
};
