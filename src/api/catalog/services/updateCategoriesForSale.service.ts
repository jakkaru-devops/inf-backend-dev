import { Transaction } from 'sequelize';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import AutoType from '../models/AutoType.model';
import ProductGroup from '../models/ProductGroup.model';
import { PRODUCT_STATUSES } from '../data';
import ProductBranch from '../models/ProductBranch.model';
import _ from 'lodash';
import { Op } from 'sequelize';

interface IProps {
  autoTypeIds: Array<AutoType['id']>;
  autoBrandIds: Array<AutoBrand['id']>;
  autoModelIds: Array<AutoModel['id']>;
  groupIds: Array<ProductGroup['id']>;
  subgroupIds: Array<ProductGroup['id']>;
  transaction: Transaction;
}

export const updateCategoriesForSaleService = async ({ transaction, ...data }: IProps) => {
  data = {
    autoTypeIds: _.uniq(data.autoTypeIds).filter(Boolean),
    autoBrandIds: _.uniq(data.autoBrandIds).filter(Boolean),
    autoModelIds: _.uniq(data.autoModelIds).filter(Boolean),
    groupIds: _.uniq(data.groupIds).filter(Boolean),
    subgroupIds: _.uniq(data.subgroupIds).filter(Boolean),
  };
  const allGroupIds = [...data.groupIds, ...data.subgroupIds];

  for (const autoTypeId of data.autoTypeIds) {
    const branch = await ProductBranch.findOne({
      where: {
        status: PRODUCT_STATUSES.SALE,
        autoTypeId,
      },
      transaction,
    });
    await AutoType.update(
      { forSale: !!branch },
      {
        where: { id: autoTypeId },
        transaction,
      },
    );
  }

  for (const autoBrandId of data.autoBrandIds) {
    const autoBrand = await AutoBrand.findByPk(autoBrandId, { transaction });
    if (!!autoBrand) {
      const branch = await ProductBranch.findOne({
        where: {
          status: PRODUCT_STATUSES.SALE,
          autoBrandId,
        },
        transaction,
      });
      const updateData = {
        forSale: !!branch,
        saleAutoTypeIds: autoBrand.saleAutoTypeIds,
      };

      for (const autoTypeId of data.autoTypeIds) {
        const branchByAutoType = await ProductBranch.findOne({
          where: {
            status: PRODUCT_STATUSES.SALE,
            autoTypeId,
            autoBrandId,
          },
          transaction,
        });
        let saleAutoTypeIds: Array<AutoType['id']> = JSON.parse(autoBrand.saleAutoTypeIds || '[]');

        if (!!branchByAutoType) saleAutoTypeIds = _.uniq(saleAutoTypeIds.concat(autoTypeId));
        else saleAutoTypeIds = saleAutoTypeIds.filter(el => el !== autoTypeId);

        updateData.saleAutoTypeIds = JSON.stringify(saleAutoTypeIds);
      }

      await autoBrand.update(updateData, { transaction });
    }
  }

  for (const autoModelId of data.autoModelIds) {
    const branch = await ProductBranch.findOne({
      where: {
        status: PRODUCT_STATUSES.SALE,
        autoModelIds: { [Op.substring]: autoModelId },
      },
      transaction,
    });
    await AutoModel.update(
      { forSale: !!branch },
      {
        where: { id: autoModelId },
        transaction,
      },
    );
  }

  for (const groupId of allGroupIds) {
    const group = await ProductGroup.findByPk(groupId, { transaction });
    if (!!group) {
      const groupKey = !group.parentId ? 'groupId' : 'subgroupId';
      const branch = await ProductBranch.findOne({
        where: {
          status: PRODUCT_STATUSES.SALE,
          [groupKey]: groupId,
        },
        transaction,
      });
      const updateData = {
        forSale: !!branch,
        saleAutoTypeIds: group.saleAutoTypeIds,
        saleAutoBrandIds: group.saleAutoBrandIds,
      };

      for (const autoTypeId of data.autoTypeIds) {
        const branchByAutoType = await ProductBranch.findOne({
          where: {
            status: PRODUCT_STATUSES.SALE,
            autoTypeId,
            [groupKey]: groupId,
          },
          transaction,
        });
        let saleAutoTypeIds: Array<AutoType['id']> = JSON.parse(group.saleAutoTypeIds || '[]');

        if (!!branchByAutoType) saleAutoTypeIds = _.uniq(saleAutoTypeIds.concat(autoTypeId));
        else saleAutoTypeIds = saleAutoTypeIds.filter(el => el !== autoTypeId);

        updateData.saleAutoTypeIds = JSON.stringify(saleAutoTypeIds);
      }
      for (const autoBrandId of data.autoBrandIds) {
        const branchByAutoBrand = await ProductBranch.findOne({
          where: {
            status: PRODUCT_STATUSES.SALE,
            autoBrandId,
            [groupKey]: groupId,
          },
          transaction,
        });
        let saleAutoBrandIds: Array<AutoBrand['id']> = JSON.parse(group.saleAutoBrandIds || '[]');

        if (!!branchByAutoBrand) saleAutoBrandIds = _.uniq(saleAutoBrandIds.concat(autoBrandId));
        else saleAutoBrandIds = saleAutoBrandIds.filter(el => el !== autoBrandId);

        updateData.saleAutoBrandIds = JSON.stringify(saleAutoBrandIds);
      }

      await group.update(updateData, { transaction });
    }
  }
};
