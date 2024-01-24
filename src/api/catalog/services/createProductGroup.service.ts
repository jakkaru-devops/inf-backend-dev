import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../../../config/env';
import { ILocale } from '../../../interfaces/common.interfaces';
import { APIError } from '../../../utils/api.utils';
import ProductGroup from '../models/ProductGroup.model';
import AutoBrandGroupRelations from '../models/relations/AutoBrandGroupRelations.model';
import AutoTypeGroupRelations from '../models/relations/AutoTypeGroupRelations.model';

interface IProps {
  status: number;
  label: string;
  catalogSectionId: string;
  nestingLevel: number;
  locales: ILocale[];
  parentId?: string;
  catalog: ProductGroup['catalog'];
  autoTypeIds: string[];
  autoBrandIds: string[];
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  productGroup: ProductGroup;
}

export const createProductGroupService = async ({
  status,
  label,
  catalogSectionId,
  nestingLevel,
  locales,
  parentId,
  catalog,
  autoTypeIds,
  autoBrandIds,
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
        message: `Требуется перевод для группы товаров на стандартном языке - ${DEFAULT_USER_LANGUAGE_LABEL}`,
      });
    }

    const definedLocales = {};
    for (const locale of locales) {
      definedLocales[`name_${locale.language}`] = locale.name;
    }

    const [productGroup] = await ProductGroup.findOrCreate({
      where: { label, catalogSectionId, nestingLevel, catalog },
      defaults: {
        status,
        label,
        catalogSectionId,
        nestingLevel,
        parentId,
        catalog,
        ...definedLocales,
      },
      transaction,
    });

    for (const autoTypeId of autoTypeIds) {
      await AutoTypeGroupRelations.findOrCreate({
        where: {
          autoTypeId,
          productGroupId: productGroup.id,
        },
        defaults: {
          autoTypeId,
          productGroupId: productGroup.id,
        },
        transaction,
      });
    }

    for (const autoBrandId of autoBrandIds) {
      await AutoBrandGroupRelations.findOrCreate({
        where: {
          autoBrandId,
          productGroupId: productGroup.id,
        },
        defaults: {
          autoBrandId,
          productGroupId: productGroup.id,
        },
        transaction,
      });
    }

    return {
      productGroup,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка. Группа товаров не добавлена',
      error: err,
    });
  }
};
