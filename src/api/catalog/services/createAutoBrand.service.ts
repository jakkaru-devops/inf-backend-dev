import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../../../config/env';
import { ILocale } from '../../../interfaces/common.interfaces';
import { APIError } from '../../../utils/api.utils';
import AutoBrand from '../models/AutoBrand.model';
import AutoTypeBrandRelations from '../models/relations/AutoTypeBrandRelations.model';
import { checkAndHideAutoBrandService } from './checkAndHideAutoBrand.service';

interface IProps {
  status: number;
  label: string;
  catalogSectionId: string;
  locales: ILocale[];
  altNames?: string[];
  autoTypeIds: string[];
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  autoBrand: AutoBrand;
}

export const createAutoBrandService = async ({
  status,
  label,
  catalogSectionId,
  locales,
  altNames,
  autoTypeIds,
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
        message: `Требуется перевод для марки авто на стандартном языке - ${DEFAULT_USER_LANGUAGE_LABEL}`,
      });
    }

    const definedLocales = {};
    for (const locale of locales) {
      definedLocales[`name_${locale.language}`] = locale.name;
    }

    let autoBrand = await AutoBrand.findOne({
      where: {
        label,
      },
      transaction,
    });

    if (!autoBrand) {
      autoBrand = await AutoBrand.create(
        {
          status,
          label,
          catalogSectionId,
          altNames,
          activeAutoTypeIds: JSON.stringify(autoTypeIds),
          ...definedLocales,
        },
        {
          transaction,
        },
      );
    } else {
      autoBrand = await autoBrand.update(
        {
          activeAutoTypeIds: JSON.stringify(autoTypeIds),
        },
        {
          transaction,
        },
      );
    }

    for (const autoTypeId of autoTypeIds) {
      await AutoTypeBrandRelations.findOrCreate({
        where: {
          autoBrandId: autoBrand.id,
          autoTypeId,
        },
        defaults: {
          autoBrandId: autoBrand.id,
          autoTypeId,
        },
        transaction,
      });
    }

    return {
      autoBrand,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка. Марка авто не добавлена',
      error: err,
    });
  }
};
