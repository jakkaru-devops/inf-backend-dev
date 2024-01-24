import { Request, Response, NextFunction } from 'express';
import seq, { Op } from 'sequelize';
import { APIError } from './../utils/api.utils';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../config/env';
import Language from '../api/language/models/Language.model';
import httpStatus from 'http-status';

export const getUserLanguage = async (req: Request, res: Response, next: NextFunction) => {
  const languageLabel = req.headers['content-language'] || DEFAULT_USER_LANGUAGE_LABEL;

  // Define filters to language list
  let whereLanguageList: seq.WhereOptions;

  // If user content language equals to default
  if (languageLabel === DEFAULT_USER_LANGUAGE_LABEL) {
    // Find only user content language
    whereLanguageList = {
      label: languageLabel,
    };
    // If user content language not equals to default
  } else {
    // Find user content language and default language
    whereLanguageList = {
      label: {
        [Op.or]: [languageLabel, DEFAULT_USER_LANGUAGE_LABEL],
      },
    };
  }

  // Get languages by filters
  const languageList = await Language.findAll({
    where: whereLanguageList,
    attributes: ['id', 'label'],
  });

  const userLanguage = languageList.find(el => el.label === languageLabel);
  const defaultUserLanguage = languageList.find(el => el.label === DEFAULT_USER_LANGUAGE_LABEL) || userLanguage;

  if (!userLanguage || !defaultUserLanguage) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'User content language is not defined',
    });
  }

  req.body.userLanguage = userLanguage;
  req.body.defaultUserLanguage = defaultUserLanguage;

  next();
};
