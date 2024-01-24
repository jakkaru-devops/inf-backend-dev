import { Op } from 'sequelize';
import { IGetterServiceParams } from '../../../interfaces/common.interfaces';
import { simplifySearchQuery } from '../../../utils/common.utils';
import AutoType from '../models/AutoType.model';

interface IProps {
  search?: string;
}

export const getAutoTypeListService = async ({ search }: IProps, opts?: IGetterServiceParams) => {
  const and = [];

  if (!!search) {
    and.push({
      nameSimplified: {
        [Op.substring]: simplifySearchQuery(search),
      },
    });
  }

  const autoTypes = await AutoType.findAndCountAll({
    limit: opts?.limit,
    offset: opts?.offset,
    where: {
      [Op.and]: and,
    },
    order: [['order', 'ASC']],
  });

  return autoTypes;
};
