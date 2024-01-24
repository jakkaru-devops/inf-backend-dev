import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import Language from '../../language/models/Language.model';
import { createLanguageService } from '../../language/services/createLanguage.service';
import { APIError } from '../../../utils/api.utils';

type IProps = {
  res: Response;
  transaction: Transaction;
};

export interface IResult {
  languageList: Language[];
}

export const createInitialLanguageListService = async ({ res, transaction }: IProps): Promise<IResult> => {
  try {
    const languagesInit = [
      {
        label: 'ru',
        locales: [
          { name: 'Русский', language: 'ru' },
          { name: 'Russian', language: 'en' },
        ],
      },
      {
        label: 'en',
        locales: [
          { name: 'English', language: 'ru' },
          { name: 'English', language: 'en' },
        ],
      },
    ];
    const languageListCreated: Language[] = [];

    // Create languages without translates firstly
    for (const lang of languagesInit) {
      const {
        result: { language: langCreated },
      } = await createLanguageService({
        label: lang.label,
        locales: lang.locales,
        transaction,
      });
      languageListCreated.push(langCreated);
    }

    return {
      languageList: languageListCreated,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating initial language list',
      strict: true,
    });
  }
};
