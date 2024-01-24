import _ from 'lodash';
import { Op } from 'sequelize';
import { IEntityId, IGetterServiceParams } from '../../../interfaces/common.interfaces';
import { PRODUCT_GROUP_CATALOGS, PUBLIC_PRODUCT_CATEGORY_STATUSES } from '../data';
import ProductGroup from '../models/ProductGroup.model';
import { getFilterItemValue, handleFilterParam, simplifySearchQuery } from '../../../utils/common.utils';

interface IProps {
  search?: string;
  includeHidden?: boolean;
  parent?: IEntityId;
  autoType?: IEntityId | IEntityId[];
  autoBrand?: IEntityId | IEntityId[];
  catalog?: 'main' | 'side';
}

export const getGroupListService = async (
  { search, includeHidden, parent, autoType, autoBrand, catalog }: IProps,
  opts?: IGetterServiceParams,
) => {
  const and = [];

  and.push({
    nestingLevel: !!parent ? 1 : 0,
    parentId: !!parent ? parent : null,
  });
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
  if (!!catalog) {
    and.push({
      catalog: catalog === 'main' ? PRODUCT_GROUP_CATALOGS.main : PRODUCT_GROUP_CATALOGS.sideList,
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
  const autoBrandIds = handleFilterParam(autoBrand);
  if (!!autoBrandIds?.length) {
    and.push({
      activeAutoBrandIds: {
        [Op.or]: autoBrandIds.map(itemId => ({
          [Op.substring]: getFilterItemValue(itemId),
        })),
      },
    });
  }

  const groups = await ProductGroup.findAndCountAll({
    limit: opts?.limit,
    offset: opts?.offset,
    where: {
      [Op.and]: and,
    },
    order: [
      ['order', 'asc'],
      ['name_ru', 'asc'],
    ],
  });

  return groups;
};
