import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import Product from '../../catalog/models/Product.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import AutoTypeBrandRelations from '../../catalog/models/relations/AutoTypeBrandRelations.model';
import AutoTypeGroupRelations from '../../catalog/models/relations/AutoTypeGroupRelations.model';
import AutoModel from '../../catalog/models/AutoModel.model';
import AutoBrandGroupRelations from '../../catalog/models/relations/AutoBrandGroupRelations.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import { PRODUCT_STATUSES } from '../../catalog/data';
import { Op } from 'sequelize';
import { simplifyHtml, stripString } from '../../../utils/common.utils';

export const transformProductsBranchesService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const startTime = new Date().getTime();
    const allProducts = await Product.findAll({
      attributes: ['id'],
      // limit: 1000,
    });
    // const allBranches = await ProductBranch.findAll();
    await ProductBranch.destroy({
      force: true,
      where: {
        id: {
          [Op.ne]: null,
        },
      },
    });
    console.log('ALL PRODUCTS COUNT', allProducts.length);
    let a = 0;

    let counter = allProducts.length;

    for (const productData of allProducts) {
      counter--;
      console.log(`${counter} products remain ${productData.id}`);

      const product = await Product.findByPk(productData.id);
      // const branchEntities = allBranches.find(branch => branch.productId === product.id);
      const autoTypeIds: string[] = JSON.parse(product.autoTypeIds);
      const autoBrandIds: string[] = JSON.parse(product.autoBrandIds);
      const autoModelIds: string[] = JSON.parse(product.autoModelIds);
      const groupIds: string[] = JSON.parse(product.groupIds);
      const groups = !!groupIds?.length ? await ProductGroup.findAll({ where: { id: groupIds } }) : [];
      const subgroupIds: string[] = JSON.parse(product.subgroupIds);
      const subgroups = !!subgroupIds?.length ? await ProductGroup.findAll({ where: { id: subgroupIds } }) : [];

      const branchesData: {
        isMain: boolean;
        tag: string;
        description: string;
        manufacturer: string;
        autoTypeId: string;
        autoBrandId: string;
        autoModelIds: string[];
        groupId: string;
        subgroupId: string;
      }[] = [];

      // console.log('BEFORE TYPES');
      // Handle types
      for (const autoTypeId of autoTypeIds) {
        // Handle brands inside types handling
        const brandRelations = await AutoTypeBrandRelations.findAll({
          where: {
            autoTypeId,
            autoBrandId: autoBrandIds,
          },
        });
        for (const { autoBrandId } of brandRelations) {
          branchesData.push({
            isMain: false,
            tag: null,
            description: null,
            manufacturer: null,
            autoTypeId,
            autoBrandId,
            autoModelIds: [],
            groupId: null,
            subgroupId: null,
          });
        }
        if (!brandRelations.length) {
          branchesData.push({
            isMain: false,
            tag: null,
            description: null,
            manufacturer: null,
            autoTypeId,
            autoBrandId: null,
            autoModelIds: [],
            groupId: null,
            subgroupId: null,
          });
        }

        /* // Handle groups inside types handling
        const groupRelations = await AutoTypeGroupRelations.findAll({
          where: {
            autoTypeId,
            productGroupId: groupIds,
          },
        });
        for (const { productGroupId } of groupRelations) {
          branchesData.push({
            isMain: false,
            tag: null,
            description: null,
            manufacturer: null,
            autoTypeId,
            autoBrandId: null,
            autoModelIds: [],
            groupId: productGroupId,
            subgroupId: null,
          });
        }
        if (!groupRelations) {
          branchesData.push({
            isMain: false,
            tag: null,
            description: null,
            manufacturer: null,
            autoTypeId,
            autoBrandId: null,
            autoModelIds: [],
            groupId: null,
            subgroupId: null,
          });
        } */
      }

      // console.log('BEFORE BRANDS');
      // Handle brands
      for (const autoBrandId of autoBrandIds) {
        const typeRelations = await AutoTypeBrandRelations.findAll({
          where: {
            autoTypeId: autoTypeIds,
            autoBrandId,
          },
        });
        if (!typeRelations.length) {
          branchesData.push({
            isMain: false,
            tag: null,
            description: null,
            manufacturer: null,
            autoTypeId: null,
            autoBrandId,
            autoModelIds: [],
            groupId: null,
            subgroupId: null,
          });
        }
      }

      // console.log('BEFORE MODELS');
      // Handle branches models ids
      for (const branchData of branchesData) {
        const whereModels: { id: string[]; autoTypeId?: string; autoBrandId?: string } = {
          id: autoModelIds,
        };
        if (!!branchData?.autoTypeId) whereModels.autoTypeId = branchData.autoTypeId;
        if (!!branchData?.autoBrandId) whereModels.autoBrandId = branchData?.autoBrandId;
        if (!whereModels?.autoTypeId && !whereModels?.autoBrandId) continue; // skip if there is no type and brand in the branch
        const autoModels = await AutoModel.findAll({
          where: whereModels,
          attributes: ['id', 'autoTypeId', 'autoBrandId'],
        });
        branchData.autoModelIds = autoModels.map(el => el.id);
      }

      // console.log('BEFORE GROUPS');
      // Handle groups
      // let groupsHandled = 0;
      let branchesLength = branchesData.length;
      for (const group of groups) {
        if (group.catalog === 'AUTO_PARTS') {
          for (let i = 0; i < branchesLength; i++) {
            const branchData = branchesData[i];
            const typeRelation = !!branchData?.autoTypeId
              ? await AutoTypeGroupRelations.findOne({
                  where: {
                    autoTypeId: branchData?.autoTypeId,
                    productGroupId: group.id,
                  },
                })
              : null;
            const brandRelation = !!branchData?.autoBrandId
              ? await AutoBrandGroupRelations.findOne({
                  where: {
                    autoBrandId: branchData?.autoBrandId,
                    productGroupId: group.id,
                  },
                })
              : null;

            let branchFound = false;
            if (!!typeRelation && !brandRelation) {
              if (!!branchData?.autoTypeId && !branchData?.autoBrandId) {
                if (!branchData?.groupId) {
                  branchData.groupId = group.id;
                } else branchFound = true;
              }
            } else if (!typeRelation && !!brandRelation) {
              if (!branchData?.autoTypeId && !!branchData?.autoBrandId) {
                if (!branchData?.groupId) {
                  branchData.groupId = group.id;
                } else branchFound = true;
              }
            } else if (!!typeRelation && !!brandRelation) {
              if (!!branchData?.autoTypeId && !!branchData?.autoBrandId) {
                if (!branchData?.groupId) {
                  branchData.groupId = group.id;
                } else branchFound = true;
              }
            }
            if (!!branchFound) {
              branchesData.push(
                JSON.parse(
                  JSON.stringify({
                    ...branchData,
                    groupId: group.id,
                  }),
                ),
              );
              // groupsHandled++;
            }
          }
        } else {
          branchesData.push({
            isMain: false,
            tag: null,
            description: null,
            manufacturer: null,
            autoTypeId: null,
            autoBrandId: null,
            autoModelIds: [],
            groupId: group.id,
            subgroupId: null,
          });
        }
      }

      // console.log('BEFORE SUBGROUPS', branchesData, subgroups.length);
      // let subgroupsHandled = 0;
      branchesLength = branchesData.length;
      // Handle subgroups
      for (const subgroup of subgroups) {
        const parentGroup = groups.find(el => el.id === subgroup?.parentId);
        if (!parentGroup) continue;

        // console.log('CHECK 1');

        for (let i = 0; i < branchesLength; i++) {
          const branchData = branchesData[i];
          if (!branchData?.groupId) continue;

          // console.log('CHECK 2');

          if (parentGroup.catalog === 'AUTO_PARTS') {
            const typeRelation = !!branchData?.autoTypeId
              ? await AutoTypeGroupRelations.findOne({
                  where: {
                    autoTypeId: branchData?.autoTypeId,
                    productGroupId: subgroup.id,
                  },
                })
              : null;
            const brandRelation = !!branchData?.autoBrandId
              ? await AutoBrandGroupRelations.findOne({
                  where: {
                    autoBrandId: branchData?.autoBrandId,
                    productGroupId: subgroup.id,
                  },
                })
              : null;

            // console.log('CHECK 3');

            let branchFound = false;
            if (!!typeRelation && !brandRelation) {
              if (!!branchData?.autoTypeId && !branchData?.autoBrandId) {
                if (!branchData?.subgroupId) {
                  branchData.subgroupId = subgroup.id;
                  // subgroupsHandled++;
                } else branchFound = true;
              }
            } else if (!typeRelation && !!brandRelation) {
              if (!branchData?.autoTypeId && !!branchData?.autoBrandId) {
                if (!branchData?.subgroupId) {
                  branchData.subgroupId = subgroup.id;
                  // subgroupsHandled++;
                } else branchFound = true;
              }
            } else if (!!typeRelation && !!brandRelation) {
              if (!!branchData?.autoTypeId && !!branchData?.autoBrandId) {
                if (!branchData?.subgroupId) {
                  branchData.subgroupId = subgroup.id;
                  // subgroupsHandled++;
                } else branchFound = true;
              }
            }
            // console.log('CHECK 4');
            if (!!branchFound) {
              branchesData.push(
                JSON.parse(
                  JSON.stringify({
                    ...branchData,
                    subgroupId: subgroup.id,
                  }),
                ),
              );
              // subgroupsHandled++;
            }
          } else {
            // console.log('CHECK 5');
            if (!branchData?.subgroupId) {
              branchData.subgroupId = subgroup.id;
              // subgroupsHandled++;
            } else {
              branchesData.push(
                JSON.parse(
                  JSON.stringify({
                    ...branchData,
                    subgroupId: subgroup.id,
                  }),
                ),
              );
              // subgroupsHandled++;
            }
          }
        }
      }

      console.log('ADD EMPTY BRANCH');
      // TODO: if there are 0 branches (no categories), create one without categories
      if (!branchesData.length) {
        branchesData.push({
          isMain: false,
          tag: null,
          description: null,
          manufacturer: null,
          autoTypeId: null,
          autoBrandId: null,
          autoModelIds: [],
          groupId: null,
          subgroupId: null,
        });
      }

      console.log('SET MAIN BRANCH');
      branchesData[0] = {
        ...branchesData[0],
        isMain: true,
        tag: product?.name_ru,
        description: product?.description_ru,
        manufacturer: product?.manufacturer,
      };

      // console.log('BRANCHES', product.id, branchesData);

      for (const branchData of branchesData) {
        await ProductBranch.create({
          productId: product.id,
          status: PRODUCT_STATUSES.DEFAULT,
          isMain: branchData.isMain,
          tag: stripString(branchData.tag),
          description: simplifyHtml(branchData?.description),
          manufacturer: stripString(branchData.manufacturer),
          autoTypeId: branchData?.autoTypeId,
          autoBrandId: branchData?.autoBrandId,
          autoModelIds: JSON.stringify(branchData?.autoModelIds || []),
          groupId: branchData?.groupId,
          subgroupId: branchData?.subgroupId,
          article: product.article,
          articleSimplified: product.articleSimplified,
        });
      }
    }

    const endTime = new Date().getTime();
    console.log('CARS COUNT', a);

    console.log(`Products transformation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'The products transformation has been successfully completed',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while products transformation',
      error: err,
    });
  }
};
