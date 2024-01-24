import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import ProductBranch from '../models/ProductBranch.model';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import ProductGroup from '../models/ProductGroup.model';
import AutoTypeBrandRelations from '../models/relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from '../models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../models/relations/AutoBrandGroupRelations.model';
import { simplifyHtml, stripString } from '../../../utils/common.utils';
import { ServiceError } from '../../../core/utils/serviceError';

export interface IProps {
  productId: string;
  userId: string;
  sourceBranchId: string;
  status: number;
  isMain: boolean;
  name: string;
  tag: string;
  description: string;
  manufacturer: string;
  autoTypeId: string;
  autoBrandId: string;
  autoModelIds: string[];
  groupId: string;
  subgroupId: string;
  article: string;
  articleSimplified: string;
}

export interface IResult {
  branch: ProductBranch;
}

export const createProductBranchService = async (
  {
    productId,
    userId,
    sourceBranchId,
    status,
    isMain,
    name,
    tag,
    description,
    manufacturer,
    autoTypeId,
    autoBrandId,
    autoModelIds,
    groupId,
    subgroupId,
    article,
    articleSimplified,
  }: IProps,
  { transaction }: { transaction: Transaction },
): Promise<ProductBranch> => {
  try {
    const branch = await ProductBranch.create(
      {
        productId,
        userId,
        sourceBranchId,
        status,
        isMain,
        tag: stripString(isMain ? name : tag),
        description: simplifyHtml(description),
        manufacturer: stripString(manufacturer),
        autoTypeId,
        autoBrandId,
        autoModelIds: JSON.stringify(autoModelIds || []),
        groupId,
        subgroupId,
        article,
        articleSimplified,
      },
      {
        transaction,
      },
    );

    if (!!autoBrandId) {
      const autoBrand = await AutoBrand.findByPk(autoBrandId, { transaction });
      const updateData: any = {};
      if (!!autoTypeId) {
        const autoTypeIds: string[] = JSON.parse(autoBrand?.activeAutoTypeIds || '[]');
        if (!autoTypeIds.includes(autoTypeId)) {
          updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.concat(autoTypeId));
        }
        await AutoTypeBrandRelations.findOrCreate({
          where: { autoTypeId, autoBrandId },
          defaults: {
            autoTypeId,
            autoBrandId,
          },
          transaction,
        });
      }
      if (autoBrand?.isHidden) {
        updateData.isHidden = false;
      }
      if (!!Object.keys(updateData).length) {
        await autoBrand.update(updateData, {
          transaction,
        });
      }
    }
    if (!!autoModelIds?.length) {
      const autoModels = await AutoModel.findAll({
        where: {
          id: autoModelIds,
        },
        transaction,
      });
      for (const autoModel of autoModels) {
        if (autoModel?.isHidden) {
          await autoModel.update(
            {
              isHidden: false,
            },
            {
              transaction,
            },
          );
        }
      }
    }
    if (!!groupId) {
      const group = await ProductGroup.findByPk(groupId, {
        transaction,
      });
      const updateData: any = {};
      if (!!autoTypeId) {
        const autoTypeIds: string[] = JSON.parse(group?.activeAutoTypeIds || '[]');
        if (!autoTypeIds.includes(autoTypeId)) {
          updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.concat(autoTypeId));
        }
        await AutoTypeGroupRelations.findOrCreate({
          where: {
            autoTypeId,
            productGroupId: groupId,
          },
          defaults: { autoTypeId, productGroupId: groupId },
          transaction,
        });
      }
      if (!!autoBrandId) {
        const autoBrandIds: string[] = JSON.parse(group?.activeAutoBrandIds || '[]');
        if (!autoBrandIds.includes(autoBrandId)) {
          updateData.activeAutoBrandIds = JSON.stringify(autoBrandIds.concat(autoBrandId));
        }
        await AutoBrandGroupRelations.findOrCreate({
          where: {
            autoBrandId,
            productGroupId: groupId,
          },
          defaults: { autoBrandId, productGroupId: groupId },
          transaction,
        });
      }
      if (group?.isHidden) {
        updateData.isHidden = false;
      }
      if (!!Object.keys(updateData).length) {
        await group.update(updateData, {
          transaction,
        });
      }
    }
    if (!!subgroupId) {
      const subgroup = await ProductGroup.findByPk(subgroupId, {
        transaction,
      });
      const updateData: any = {};
      if (!!autoTypeId) {
        const autoTypeIds: string[] = JSON.parse(subgroup?.activeAutoTypeIds || '[]');
        if (!autoTypeIds.includes(autoTypeId)) {
          updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.concat(autoTypeId));
        }
        await AutoTypeGroupRelations.findOrCreate({
          where: {
            autoTypeId,
            productGroupId: subgroupId,
          },
          defaults: { autoTypeId, productGroupId: subgroupId },
          transaction,
        });
      }
      if (!!autoBrandId) {
        const autoBrandIds: string[] = JSON.parse(subgroup?.activeAutoBrandIds || '[]');
        if (!autoBrandIds.includes(autoBrandId)) {
          updateData.activeAutoBrandIds = JSON.stringify(autoBrandIds.concat(autoBrandId));
        }
        await AutoBrandGroupRelations.findOrCreate({
          where: {
            autoBrandId,
            productGroupId: subgroupId,
          },
          defaults: { autoBrandId, productGroupId: subgroupId },
          transaction,
        });
      }
      if (subgroup?.isHidden) {
        updateData.isHidden = false;
      }
      if (!!Object.keys(updateData).length) {
        await subgroup.update(updateData, {
          transaction,
        });
      }
    }

    return branch;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при создании ветки товара',
      error: err,
    });
  }
};
