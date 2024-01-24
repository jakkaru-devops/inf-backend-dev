import { Op, Transaction } from 'sequelize';
import httpStatus from 'http-status';
import ProductBranch from '../models/ProductBranch.model';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import ProductGroup from '../models/ProductGroup.model';
import AutoTypeBrandRelations from '../models/relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from '../models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../models/relations/AutoBrandGroupRelations.model';
import { ServiceError } from '../../../core/utils/serviceError';

export interface IProps {
  branchId: string;
  isMain?: boolean;
  status?: number;
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

export const updateProductBranchService = async (
  {
    branchId,
    status,
    isMain,
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
    let branch = await ProductBranch.findByPk(branchId, {
      transaction,
    });

    if (autoBrandId !== branch.autoBrandId) {
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
      if (!!branch?.autoBrandId) {
        const autoBrand = await AutoBrand.findByPk(branch?.autoBrandId, { transaction });
        const updateData: any = {};
        if (!!branch?.autoTypeId) {
          const otherBranch = await ProductBranch.findOne({
            where: {
              id: {
                [Op.ne]: branch.id,
              },
              autoTypeId: branch?.autoTypeId,
              autoBrandId: branch?.autoBrandId,
            },
            transaction,
          });
          const autoTypeIds: string[] = JSON.parse(autoBrand?.activeAutoTypeIds || '[]');
          if (!otherBranch) {
            updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.filter(el => el !== autoTypeId));
            await AutoTypeBrandRelations.destroy({
              where: {
                autoTypeId: branch?.autoTypeId,
                autoBrandId: branch?.autoBrandId,
              },
              transaction,
            });
          }
        }
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            autoBrandId: branch?.autoBrandId,
          },
          transaction,
        });
        if (!otherBranch) {
          updateData.isHidden = true;
        }
        if (!!Object.keys(updateData).length) {
          await autoBrand.update(updateData, {
            transaction,
          });
        }
      }
    }

    if (JSON.stringify(autoModelIds || []) !== branch?.autoModelIds) {
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
      const autoModelIdsParsed: string = JSON.parse(branch?.autoModelIds || '[]');
      if (!!autoModelIdsParsed?.length) {
        for (const autoModelId of autoModelIdsParsed) {
          const updateData: any = {};
          const otherBranch = await ProductBranch.findOne({
            where: {
              id: {
                [Op.ne]: branch.id,
              },
              autoModelIds: {
                [Op.substring]: autoModelId,
              },
            },
            transaction,
          });
          if (!otherBranch) {
            updateData.isHidden = true;
          }
          if (!!Object.keys(updateData).length) {
            await AutoModel.update(updateData, {
              where: {
                id: autoModelId,
              },
              transaction,
            });
          }
        }
      }
    }

    if (groupId !== branch?.groupId) {
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
      if (!!branch?.groupId) {
        const group = await ProductGroup.findByPk(branch?.groupId);
        const updateData: any = {};
        if (!!branch?.autoTypeId) {
          const otherBranch = await ProductBranch.findOne({
            where: {
              id: {
                [Op.ne]: branch.id,
              },
              autoTypeId: branch?.autoTypeId,
              groupId: branch?.groupId,
            },
            transaction,
          });
          const autoTypeIds: string[] = JSON.parse(group?.activeAutoTypeIds || '[]');
          if (!otherBranch) {
            updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.filter(el => el !== autoTypeId));
            await AutoTypeGroupRelations.destroy({
              where: {
                autoTypeId: branch?.autoTypeId,
                productGroupId: branch?.groupId,
              },
              transaction,
            });
          }
        }
        if (!!branch?.autoBrandId) {
          const otherBranch = await ProductBranch.findOne({
            where: {
              id: {
                [Op.ne]: branch.id,
              },
              autoBrandId: branch?.autoBrandId,
              groupId: branch?.groupId,
            },
            transaction,
          });
          const autoBrandIds: string[] = JSON.parse(group?.activeAutoBrandIds || '[]');
          if (!otherBranch) {
            updateData.activeAutoBrandIds = JSON.stringify(autoBrandIds.filter(el => el !== autoBrandId));
            await AutoBrandGroupRelations.destroy({
              where: {
                autoBrandId: branch?.autoBrandId,
                productGroupId: branch?.groupId,
              },
              transaction,
            });
          }
        }
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            groupId: branch?.groupId,
          },
          transaction,
        });
        if (!otherBranch) {
          updateData.isHidden = true;
        }
        if (!!Object.keys(updateData).length) {
          await group.update(updateData, {
            transaction,
          });
        }
      }
    }

    if (subgroupId !== branch?.subgroupId) {
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
      if (!!branch?.subgroupId) {
        const subgroup = await ProductGroup.findByPk(branch?.subgroupId);
        const updateData: any = {};
        if (!!branch?.autoTypeId) {
          const otherBranch = await ProductBranch.findOne({
            where: {
              id: {
                [Op.ne]: branch.id,
              },
              autoTypeId: branch?.autoTypeId,
              subgroupId: branch?.subgroupId,
            },
            transaction,
          });
          const autoTypeIds: string[] = JSON.parse(subgroup?.activeAutoTypeIds || '[]');
          if (!otherBranch) {
            updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.filter(el => el !== autoTypeId));
            await AutoTypeGroupRelations.destroy({
              where: {
                autoTypeId: branch?.autoTypeId,
                productGroupId: branch?.subgroupId,
              },
              transaction,
            });
          }
        }
        if (!!branch?.autoBrandId) {
          const otherBranch = await ProductBranch.findOne({
            where: {
              id: {
                [Op.ne]: branch.id,
              },
              autoBrandId: branch?.autoBrandId,
              subgroupId: branch?.subgroupId,
            },
            transaction,
          });
          const autoBrandIds: string[] = JSON.parse(subgroup?.activeAutoBrandIds || '[]');
          if (!otherBranch) {
            updateData.activeAutoBrandIds = JSON.stringify(autoBrandIds.filter(el => el !== autoBrandId));
            await AutoBrandGroupRelations.destroy({
              where: {
                autoBrandId: branch?.autoBrandId,
                productGroupId: branch?.subgroupId,
              },
              transaction,
            });
          }
        }
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            subgroupId: branch?.subgroupId,
          },
          transaction,
        });
        if (!otherBranch) {
          updateData.isHidden = true;
        }
        if (!!Object.keys(updateData).length) {
          await subgroup.update(updateData, {
            transaction,
          });
        }
      }
    }

    const updateData: any = {
      tag,
      status,
      description,
      manufacturer,
      autoTypeId,
      autoBrandId,
      autoModelIds: JSON.stringify(autoModelIds || []),
      groupId,
      subgroupId,
      article,
      articleSimplified,
    };
    if (typeof isMain !== 'undefined') {
      updateData.isMain = isMain;
    }

    branch = await branch.update(updateData, {
      transaction,
    });

    return branch;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error while updating product branch',
      error: err,
    });
  }
};
