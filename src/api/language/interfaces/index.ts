import Language from '../models/Language.model';

export interface ILanguage extends Language {
  name: string;
  isDefault?: boolean;
}
