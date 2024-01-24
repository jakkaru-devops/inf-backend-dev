import { Op } from 'sequelize';
import { simplifyProductArticle, simplifyStr } from '.';

export const defineProductsSearchParams = ({
  search,
  exactSearch,
  exactSearchBy,
  searchFields,
}: {
  search: string;
  exactSearch?: boolean;
  exactSearchBy?: 'article';
  searchFields?: Array<'name' | 'description' | 'article'>;
}): any => {
  const or = [];
  const words = simplifyStr(search).split(' ');

  if (searchFields.includes('name')) {
    if (exactSearch) {
      or.push({
        name_ru: search,
      });
    } else {
      or.push({
        tagsJson: {
          [Op.and]: words.map(word => ({
            [Op.substring]: word,
          })),
        },
      });
    }
  }
  if (searchFields.includes('description')) {
    or.push({
      description_ru: exactSearch
        ? search
        : {
            [Op.iLike]: `%${search}%`,
          },
    });
  }
  if (searchFields.includes('article')) {
    if (exactSearch) {
      const articleSimplified = simplifyProductArticle(search);
      if (!!articleSimplified?.length) {
        or.push({
          articleSimplified: articleSimplified,
        });
      }
    } else {
      const articleSimplified = simplifyProductArticle(search);
      if (!!articleSimplified?.length) {
        or.push({
          articleSimplified:
            exactSearchBy === 'article'
              ? articleSimplified
              : {
                  [Op.substring]: articleSimplified,
                },
        });
      }
    }
  }

  if (or.length === 1) {
    return or[0];
  } else {
    return { [Op.or]: or };
  }
};
