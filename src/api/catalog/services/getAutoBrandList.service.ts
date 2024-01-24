import _ from 'lodash';
import { Op } from 'sequelize';
import { IEntityId, IGetterServiceParams } from '../../../interfaces/common.interfaces';
import { getFilterItemValue, handleFilterParam, simplifySearchQuery } from '../../../utils/common.utils';
import { PUBLIC_PRODUCT_CATEGORY_STATUSES } from '../data';
import AutoBrand from '../models/AutoBrand.model';

interface IProps {
  search?: string;
  includeHidden?: boolean;
  autoType?: IEntityId | IEntityId[];
}

export const getAutoBrandListService = async (
  { search, includeHidden, autoType }: IProps,
  opts?: IGetterServiceParams,
) => {
  const and = [];

  if (!!search) {
    and.push({
      nameSimplified: {
        [Op.substring]: simplifySearchQuery(search),
      },
    });
  }
  if (!includeHidden) {
    and.push({
      isHidden: false,
      status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
    });
  }

  const autoTypeIds = handleFilterParam(autoType);
  if (!!autoTypeIds?.length) {
    and.push({
      activeAutoTypeIds: {
        [Op.or]: autoTypeIds.map(itemId => ({
          [Op.substring]: getFilterItemValue(itemId),
        })),
      },
    });
  }

  const autoBrands = await AutoBrand.findAndCountAll({
    limit: opts?.limit,
    offset: opts?.offset,
    where: {
      [Op.and]: and,
    },
    order: [['name_ru', 'asc']],
  });

  return autoBrands;
};
