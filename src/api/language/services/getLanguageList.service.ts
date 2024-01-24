import seq from 'sequelize';
import { filterObject } from '../../../utils/common.utils';
import Language from '../models/Language.model';

export interface IGetLanguageListServiceProps {
  options?: seq.FindAndCountOptions;
}

export const getLanguageListService = async ({ options }: IGetLanguageListServiceProps) => {
  // Init search options
  if (!options) {
    options = {};
  }
  if (options.where) {
    options.where = filterObject(options.where, undefined);
  }

  // DB request
  const list = await Language.findAndCountAll(options);

  // Result
  return list;
};
