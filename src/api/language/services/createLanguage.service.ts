import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { ILocale, IServiceResponse } from '../../../interfaces/common.interfaces';
import { LANGUAGES } from '../data';
import Language from '../models/Language.model';

export interface IProps {
  label: string;
  locales: ILocale[];
  transaction: Transaction;
}

export interface IResponse {
  language: Language;
}

export const createLanguageService = async ({
  label,
  locales,
  transaction,
}: IProps): Promise<IServiceResponse<IResponse>> => {
  try {
    const dto: any = {
      label,
    };

    if (locales.length < LANGUAGES.length) {
      return {
        error: {
          status: httpStatus.BAD_REQUEST,
          message: `An Error has occured while creating language ${label}.  Locales on all system languages required`,
        },
      };
    }

    for (const locale of locales) {
      dto[`name_${locale.language}`] = locale.name;
    }

    const language = await Language.create(dto, {
      transaction,
    });
    if (!language) {
      return {
        error: {
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Language was not created',
          error: language,
        },
      };
    }

    return {
      result: {
        language,
      },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: `An Error has occured while creating language ${label}`,
        error: err,
      },
    };
  }
};
