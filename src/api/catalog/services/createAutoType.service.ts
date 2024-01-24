import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../../../config/env';
import { ILocale } from '../../../interfaces/common.interfaces';
import { APIError } from '../../../utils/api.utils';
import AutoType from '../models/AutoType.model';

interface IProps {
  label: string;
  locales: ILocale[];
  order: number;
  catalogSectionId: string;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  autoType: AutoType;
}

export const createAutoTypeService = async ({
  label,
  catalogSectionId,
  order,
  locales,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    // Filter locales
    locales = locales.filter(locale => locale.name && locale.name.trim().length > 0);
    if (!locales.find(locale => locale.language === DEFAULT_USER_LANGUAGE_LABEL)) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: `Требуется перевод для вида техники на стандартном языке - ${DEFAULT_USER_LANGUAGE_LABEL}`,
      });
    }

    const definedLocales = {};
    for (const locale of locales) {
      definedLocales[`name_${locale.language}`] = locale.name;
    }

    const [autoType] = await AutoType.findOrCreate({
      where: { label },
      defaults: {
        label,
        catalogSectionId,
        order,
        ...definedLocales,
      },
      transaction,
    });

    return {
      autoType,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка. Вид техники не добавлен',
      error: err,
    });
  }
};
