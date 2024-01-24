import _ from 'lodash';
import { Op } from 'sequelize';
import { IEntityId, IGetterServiceParams } from '../../../interfaces/common.interfaces';
import { simplifySearchQuery } from '../../../utils/common.utils';
import { PUBLIC_PRODUCT_CATEGORY_STATUSES } from '../data';
import AutoModel from '../models/AutoModel.model';

interface IProps {
  search?: string;
  includeHidden?: boolean;
  autoTypeId?: IEntityId;
  autoBrandId: IEntityId;
}

export const getAutoModelListService = async (
  { search, includeHidden, autoTypeId, autoBrandId }: IProps,
  opts?: IGetterServiceParams,
) => {
  const and: any = [
    {
      autoBrandId,
    },
  ];

  if (!!autoTypeId) {
    and.push({
      autoTypeId,
    });
  }
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

  const autoModels = await AutoModel.findAndCountAll({
    limit: opts?.limit,
    offset: opts?.offset,
    where: {
      [Op.and]: and,
    },
    order: [['name_ru', 'asc']],
  });

  return autoModels;
};
