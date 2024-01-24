import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../../../config/env';
import { ILocale } from '../../../interfaces/common.interfaces';
import { APIError } from '../../../utils/api.utils';
import AutoModel from '../models/AutoModel.model';

interface IProps {
  status: number;
  label: string;
  catalogSectionId: string;
  locales: ILocale[];
  autoTypeId: string;
  autoBrandId: string;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  autoModel: AutoModel;
}

export const createAutoModelService = async ({
  status,
  label,
  catalogSectionId,
  locales,
  autoTypeId,
  autoBrandId,
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
        message: `Требуется перевод для модели авто на стандартном языке - ${DEFAULT_USER_LANGUAGE_LABEL}`,
      });
    }

    const definedLocales = {};
    for (const locale of locales) {
      definedLocales[`name_${locale.language}`] = locale.name;
    }

    const [autoModel] = await AutoModel.findOrCreate({
      where: {
        label,
        catalogSectionId,
        autoTypeId,
        autoBrandId,
        ...definedLocales,
      },
      defaults: {
        status,
        label,
        catalogSectionId,
        autoTypeId,
        autoBrandId,
        ...definedLocales,
      },
      transaction,
    });

    return {
      autoModel,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка. Модель авто не добавлена',
      error: err,
    });
  }
};
