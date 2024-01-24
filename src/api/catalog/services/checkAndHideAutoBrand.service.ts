import httpStatus from 'http-status';
import { Transaction, Op } from 'sequelize';
import { PUBLIC_PRODUCT_STATUSES } from '../data';
import AutoBrand from '../models/AutoBrand.model';
import Product from '../models/Product.model';
import AutoTypeBrandRelations from '../models/relations/AutoTypeBrandRelations.model';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  autoBrand: AutoBrand;
  autoTypeIds: string[];
  excludeProductId: string | string[];
  excludeProductIdAutoTypes: string | string[];
}

export const checkAndHideAutoBrandService = async (
  { autoBrand, autoTypeIds, excludeProductId, excludeProductIdAutoTypes }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  try {
    const activeAutoTypeIds: string[] = [];
    const updateData: any = {};

    for (const autoTypeId of autoTypeIds) {
      const searchStr = JSON.stringify([autoTypeId, autoBrand.id]).replace('[', '').replace(']', '');
      const product = await Product.findOne({
        where: {
          id: {
            [Op.notIn]: [].concat(excludeProductIdAutoTypes).filter(Boolean),
          },
          status: PUBLIC_PRODUCT_STATUSES,
          branchCategoriesJson: {
            [Op.substring]: searchStr,
          },
        },
        attributes: ['id', 'status', 'branchCategoriesJson'],
        transaction,
      });
      if (!!product) {
        activeAutoTypeIds.push(autoTypeId);
      }
    }
    updateData.activeAutoTypeIds = JSON.stringify(activeAutoTypeIds);

    const product = await Product.findOne({
      where: {
        id: {
          [Op.notIn]: [].concat(excludeProductId).filter(Boolean),
        },
        status: PUBLIC_PRODUCT_STATUSES,
        branchCategoriesJson: {
          [Op.substring]: autoBrand.id,
        },
      },
      attributes: ['id', 'status', 'branchCategoriesJson'],
      transaction,
    });
    updateData.isHidden = !product;

    const currentActiveAutoTypeIds: string[] = JSON.parse(autoBrand.activeAutoTypeIds || '[]');
    const deleteAutoTypeIds = currentActiveAutoTypeIds.filter(el => !autoTypeIds.includes(el));
    for (const autoTypeId of deleteAutoTypeIds) {
      await AutoTypeBrandRelations.destroy({
        force: true,
        where: {
          autoBrandId: autoBrand.id,
          autoTypeId,
        },
        limit: 1,
        transaction,
      });
    }

    await autoBrand.update(updateData, {
      transaction,
    });

    return {
      deleteAutoTypeIds,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: `Ошибка при обновлении марки ${autoBrand.name_ru}`,
    });
  }
};
