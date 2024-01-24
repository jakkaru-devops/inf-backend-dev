import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { DEFAULT_USER_LANGUAGE_LABEL } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { transformEntityLocale } from '../../../utils/common.utils';
import Language from '../models/Language.model';
import { getLanguageListService } from '../services/getLanguageList.service';

class LanguagesCtrl {
  /**
   * @desc      Get list of system languages
   * @route     GET /language/list
   * @success 	ILanguage[]
   * @access    Public
   */
  getList = async (req: Request, res: Response) => {
    try {
      const languages = await getLanguageListService({});

      languages.rows = languages.rows.map(
        lang =>
          ({
            ...transformEntityLocale(lang),
            isDefault: lang.label === DEFAULT_USER_LANGUAGE_LABEL,
          } as Language),
      );

      return APIResponse({
        res,
        data: languages,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Language list not loaded',
        error: err,
      });
    }
  };
}

export default LanguagesCtrl;
