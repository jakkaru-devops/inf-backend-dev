import { Response } from 'express';
import { Transaction } from 'sequelize';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import { ICreateProductAnalogDto } from '../interfaces/dto';
import httpStatus from 'http-status';
import ProductAnalogs from '../models/ProductAnalogs.model';
import ProductBranch from '../models/ProductBranch.model';
import { APIError } from '../../../utils/api.utils';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import ProductGroup from '../models/ProductGroup.model';
import { Op } from 'sequelize';
import AutoTypeBrandRelations from '../models/relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from '../models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../models/relations/AutoBrandGroupRelations.model';
import { ServiceError } from '../../../core/utils/serviceError';

export interface IProps {
  branchId: string;
}

export const deleteProductBranchService = async (
  { branchId }: IProps,
  { transaction }: { transaction: Transaction },
): Promise<ProductBranch> => {
  try {
    const branch = await ProductBranch.findByPk(branchId, {
      transaction,
    });
    console.log('DELETE BRANCH', branch.toJSON());
    const { productId, autoTypeId, autoBrandId, autoModelIds, groupId, subgroupId } = branch;

    if (!!autoBrandId) {
      const autoBrand = await AutoBrand.findByPk(autoBrandId, { transaction });
      const updateData: any = {};
      if (!!autoTypeId) {
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            autoTypeId,
            autoBrandId,
          },
          transaction,
        });
        const autoTypeIds: string[] = JSON.parse(autoBrand?.activeAutoTypeIds || '[]');
        if (!otherBranch) {
          updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.filter(el => el !== autoTypeId));
          await AutoTypeBrandRelations.destroy({
            where: {
              autoTypeId,
              autoBrandId,
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
          autoBrandId,
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

    const autoModelIdsParsed: string[] = JSON.parse(autoModelIds || '[]');
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

    if (!!groupId) {
      const group = await ProductGroup.findByPk(groupId);
      const updateData: any = {};
      if (!!autoTypeId) {
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            autoTypeId,
            groupId,
          },
          transaction,
        });
        const autoTypeIds: string[] = JSON.parse(group?.activeAutoTypeIds || '[]');
        if (!otherBranch) {
          updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.filter(el => el !== autoTypeId));
          await AutoTypeGroupRelations.destroy({
            where: {
              autoTypeId,
              productGroupId: groupId,
            },
            transaction,
          });
        }
      }
      if (!!autoBrandId) {
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            autoBrandId,
            groupId,
          },
          transaction,
        });
        const autoBrandIds: string[] = JSON.parse(group?.activeAutoBrandIds || '[]');
        if (!otherBranch) {
          updateData.activeAutoBrandIds = JSON.stringify(autoBrandIds.filter(el => el !== autoBrandId));
          await AutoBrandGroupRelations.destroy({
            where: {
              autoBrandId,
              productGroupId: groupId,
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
          groupId,
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

    if (!!subgroupId) {
      const subgroup = await ProductGroup.findByPk(subgroupId);
      const updateData: any = {};
      if (!!autoTypeId) {
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            autoTypeId,
            subgroupId,
          },
          transaction,
        });
        const autoTypeIds: string[] = JSON.parse(subgroup?.activeAutoTypeIds || '[]');
        if (!otherBranch) {
          updateData.activeAutoTypeIds = JSON.stringify(autoTypeIds.filter(el => el !== autoTypeId));
          await AutoTypeGroupRelations.destroy({
            where: {
              autoTypeId,
              productGroupId: subgroupId,
            },
            transaction,
          });
        }
      }
      if (!!autoBrandId) {
        const otherBranch = await ProductBranch.findOne({
          where: {
            id: {
              [Op.ne]: branch.id,
            },
            autoBrandId,
            subgroupId,
          },
          transaction,
        });
        const autoBrandIds: string[] = JSON.parse(subgroup?.activeAutoBrandIds || '[]');
        if (!otherBranch) {
          updateData.activeAutoBrandIds = JSON.stringify(autoBrandIds.filter(el => el !== autoBrandId));
          await AutoBrandGroupRelations.destroy({
            where: {
              autoBrandId,
              productGroupId: subgroupId,
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
          subgroupId,
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

    await branch.destroy({
      transaction,
    });

    return branch;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error while deleting product branch',
      error: err,
    });
  }
};
