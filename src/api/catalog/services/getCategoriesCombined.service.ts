import seq, { Op, Sequelize } from 'sequelize';
import _ from 'lodash';
import AutoBrand from '../models/AutoBrand.model';
import ProductGroup from '../models/ProductGroup.model';
import AutoType from '../models/AutoType.model';

interface IProps {
  search?: string;
}
interface IResultRow {
  id: string;
  name: string;
  label: string;
  isHidden: boolean;
  type: 'autoBrand' | 'group';
  autoType?: {
    id: string;
    name: string;
    label: string;
  };
}

export const getCategoriesCombinedService = async ({ search }: IProps) => {
  if (!search?.trim()?.length) return [];

  const autoTypes = await AutoType.findAll();
  const autoBrands = await AutoBrand.findAll({
    where: {
      [Op.or]: {
        name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
          [Op.substring]: search.toLowerCase(),
        } as seq.LogicType),
        label: Sequelize.where(Sequelize.fn('lower', Sequelize.col('label')), {
          [Op.substring]: search.toLowerCase(),
        } as seq.LogicType),
      },
    },
  });
  const groups = await ProductGroup.findAll({
    where: {
      nestingLevel: 0,
      parentId: null,
      catalog: ['AUTO_PRODUCTS', 'AUTO_TOOLS'],
      [Op.or]: {
        name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
          [Op.substring]: search.toLowerCase(),
        } as seq.LogicType),
        label: Sequelize.where(Sequelize.fn('lower', Sequelize.col('label')), {
          [Op.substring]: search.toLowerCase(),
        } as seq.LogicType),
      },
    },
  });

  const result: IResultRow[] = [];

  for (const autoBrand of autoBrands) {
    const autoTypeIds: string[] = JSON.parse(autoBrand?.activeAutoTypeIds || '[]');
    for (const autoTypeId of autoTypeIds) {
      const autoType = autoTypes.find(el => el.id === autoTypeId);
      if (!autoType) continue;

      result.push({
        id: autoBrand.id,
        name: autoBrand.name_ru,
        label: autoBrand.label,
        isHidden: autoBrand.isHidden,
        type: 'autoBrand',
        autoType: {
          id: autoType.id,
          name: autoType.name_ru,
          label: autoType.label,
        },
      });
    }
  }
  for (const group of groups) {
    result.push({
      id: group.id,
      name: group.name_ru,
      label: group.label,
      isHidden: group.isHidden,
      type: 'group',
    });
  }

  return result;
};
