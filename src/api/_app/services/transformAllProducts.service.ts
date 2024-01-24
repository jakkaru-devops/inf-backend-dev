import { Request, Response } from 'express';
import httpStatus from 'http-status';
import fs from 'fs';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { Op } from 'sequelize';
import {
  DEFAULT_AUTO_TYPES,
  DEFAULT_CATALOG_SECTION,
  PRODUCT_STATUSES,
  PUBLIC_PRODUCT_STATUSES,
} from '../../catalog/data';
import { createAutoTypeService } from '../../catalog/services/createAutoType.service';
import { createCatalogSectionService } from '../../catalog/services/createCatalogSection.service';
import { ALL_PRODUCTS_FOLDER } from '../data';
import { createProductService } from '../../catalog/services/createProduct.service';
import AutoType from '../../catalog/models/AutoType.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import { createAutoBrandService } from '../../catalog/services/createAutoBrand.service';
import { generateLabel } from '../../../utils/common.utils';
import AutoModel from '../../catalog/models/AutoModel.model';
import { createAutoModelService } from '../../catalog/services/createAutoModel.service';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import Product from '../../catalog/models/Product.model';
import { createProductGroupService } from '../../catalog/services/createProductGroup.service';
import AutoTypeGroupRelations from '../../catalog/models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../../catalog/models/relations/AutoBrandGroupRelations.model';
import RecommendedProducts from '../../catalog/models/RecommendedProducts.model';
import ProductAnalogs from '../../catalog/models/ProductAnalogs.model';
import formatDistance from 'date-fns/formatDistance';
import ProductSectionRelations from '../../catalog/models/relations/ProductSectionRelations.model';
import ProductAutoTypeRelations from '../../catalog/models/relations/ProductAutoTypeRelations.model';
import ProductAutoBrandRelations from '../../catalog/models/relations/ProductAutoBrandRelations.model';
import ProductAutoModelRelations from '../../catalog/models/relations/ProductAutoModelRelations.model';
import ProductGroupRelations from '../../catalog/models/relations/ProductGroupRelations.model';
import ProductApplicability from '../../catalog/models/ProductApplicability.model';
import {
  getAutoTypeName,
  getBranchesCategoriesJson,
  simplifyProductArticle,
  simplifyProductName,
} from '../../catalog/utils';
import { ALL_AUTO_BRANDS } from '../data/products';
import AutoTypeBrandRelations from '../../catalog/models/relations/AutoTypeBrandRelations.model';
import CatalogSection from '../../catalog/models/CatalogSection.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';

interface IProductTree {
  [key: string]: {
    [key: string]: {
      [key: string]: string;
    };
  };
}

export const transformAllProductsService = async (req: Request, res: Response) => {
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

    // const catalogSection = await CatalogSection.findOne();
    // const autoTypeEntities = (await AutoType.findAll()).map(el => el.toJSON() as AutoType);
    // const autoBrandEntities = (await AutoBrand.findAll()).map(el => el.toJSON() as AutoBrand);
    const SECTION_SIZE = 1000;
    const allProductsCount = await Product.count();
    const allProducts = await Product.findAll({
      attributes: ['id', 'article', 'articleSimplified', 'name_ru'],
    });
    console.log('ALL PRODUCTS COUNT', allProductsCount);
    const totalSectionsNumber = Math.ceil(allProductsCount / SECTION_SIZE);
    let a = 0;

    let duplicatesCount = 0;
    let counter = allProductsCount;

    for (const productData of allProducts) {
      counter--;
      console.log(`${counter} products remain`);

      // const branchEntities = await ProductBranch.findAll({
      //   where: {
      //     productId: productData.id,
      //     status: PUBLIC_PRODUCT_STATUSES,
      //   },
      //   attributes: ['id', 'productId', 'status', 'autoTypeId', 'autoBrandId', 'autoModelIds', 'groupId', 'subgroupId'],
      // });
      // const branchCategoriesJson = JSON.stringify(getBranchesCategoriesJson(branchEntities));

      const nameSimplified = simplifyProductName(productData.name_ru, productData.article);
      await Product.update(
        {
          // branchCategoriesJson,
          nameSimplified,
        },
        {
          where: {
            id: productData.id,
          },
        },
      );

      /* await ProductBranch.update(
        {
          article: productData.article,
          articleSimplified: productData.articleSimplified,
        },
        {
          where: {
            productId: productData.id,
          },
        },
      ); */
    }

    /* for (const productData of allProducts) {
      counter--;
      console.log(`${counter} products remain`);

      const product = await Product.findByPk(productData.id, {
        include: [
          {
            model: AutoType,
            as: 'autoTypes',
            required: false,
          },
          {
            model: AutoBrand,
            as: 'autoBrands',
            required: false,
          },
          {
            model: AutoModel,
            as: 'autoModels',
            required: false,
          },
          {
            model: ProductGroup,
            as: 'groups',
            required: false,
            where: {
              parentId: null,
            },
          },
          {
            model: ProductGroup,
            as: 'subgroups',
            required: false,
            where: {
              parentId: {
                [Op.ne]: null,
              },
            },
          },
        ],
      });
      await product.update({
        autoTypeIds: JSON.stringify(product.autoTypes.map(el => el.id)),
        autoBrandIds: JSON.stringify(product.autoBrands.map(el => el.id)),
        autoModelIds: JSON.stringify(product.autoModels.map(el => el.id)),
        groupIds: JSON.stringify(product.groups.map(el => el.id)),
        subgroupIds: JSON.stringify(product.subgroups.map(el => el.id)),
      });
    } */

    // for (const product of allProducts) {
    //   counter--;
    //   console.log(`${counter} products remain. Number of duplicates - ${duplicatesCount}`);

    //   /* const productEntity = await Product.findByPk(product?.id, { attributes: ['id'] });
    //   if (!productEntity) continue;

    //   const duplicates = await Product.findAll({
    //     where: {
    //       id: {
    //         [Op.ne]: product.id,
    //       },
    //       article: product.article,
    //       code: product.code,
    //       name_ru: product.name_ru,
    //     },
    //     attributes: ['id', 'article', 'code', 'name_ru'],
    //   });
    //   if (!!duplicates.length) {
    //     console.log(`Duplicate code - ${duplicates.map(el => el.code).join(', ')} product code - ${product.code}`);

    //     const duplicateIds = duplicates.map(el => el.id);
    //     const analogs = await ProductAnalogs.findAll({
    //       where: {
    //         analogId: [product.id, ...duplicateIds].filter(Boolean),
    //       },
    //     });
    //     const recommendedProducts = await RecommendedProducts.findAll({
    //       where: {
    //         recommendedProductId: [product.id, ...duplicateIds].filter(Boolean),
    //       },
    //     });

    //     for (const analogProduct of analogs) {
    //       if (!analogProduct?.id) continue;
    //       await ProductAnalogs.findOrCreate({
    //         where: {
    //           productId: product.id,
    //           analogId: analogProduct.id,
    //         },
    //         defaults: {
    //           productId: product.id,
    //           analogId: analogProduct.id,
    //         },
    //       });
    //     }
    //     for (const recommendedProduct of recommendedProducts) {
    //       if (!recommendedProduct?.id) continue;
    //       await RecommendedProducts.findOrCreate({
    //         where: {
    //           productId: product.id,
    //           recommendedProductId: recommendedProduct.id,
    //         },
    //         defaults: {
    //           productId: product.id,
    //           recommendedProductId: recommendedProduct.id,
    //         },
    //       });
    //     }

    //     await ProductSectionRelations.destroy({
    //       where: {
    //         productId: duplicateIds,
    //       },
    //     });
    //     await ProductAutoTypeRelations.destroy({
    //       where: {
    //         productId: duplicateIds,
    //       },
    //     });
    //     await ProductAutoBrandRelations.destroy({
    //       where: {
    //         productId: duplicateIds,
    //       },
    //     });
    //     await ProductAutoModelRelations.destroy({
    //       where: {
    //         productId: duplicateIds,
    //       },
    //     });
    //     await ProductGroupRelations.destroy({
    //       where: {
    //         productId: duplicateIds,
    //       },
    //     });
    //     await ProductApplicability.destroy({
    //       where: {
    //         productId: duplicateIds,
    //       },
    //     });
    //     await ProductAnalogs.destroy({
    //       where: {
    //         [Op.or]: [
    //           {
    //             productId: duplicateIds,
    //           },
    //           {
    //             analogId: duplicateIds,
    //           },
    //         ],
    //       },
    //     });
    //     await RecommendedProducts.destroy({
    //       where: {
    //         [Op.or]: [
    //           {
    //             productId: duplicateIds,
    //           },
    //           {
    //             recommendedProductId: duplicateIds,
    //           },
    //         ],
    //       },
    //     });
    //     await Product.destroy({
    //       where: {
    //         id: duplicateIds,
    //       },
    //     });

    //     duplicatesCount++;
    //     console.log(`${duplicateIds.join(', ')} are duplicates of ${product.id}`);
    //   } */

    //   // await product.update({
    //   //   articleSimplified: simplifyProductArticle(product.article),
    //   // });

    //   /* // Transform relations to categories
    //   const autoTypeRelations = await ProductAutoTypeRelations.findAll({
    //     where: {
    //       productId: product.id,
    //     }
    //   })
    //   const autoTypeIds = autoTypeRelations.map(el => el.autoTypeId)

    //   const autoBrandRelations = await ProductAutoBrandRelations.findAll({
    //     where: {
    //       productId: product.id,
    //     }
    //   })
    //   const autoBrandIds = autoBrandRelations.map(el => el.autoBrandId)

    //   const autoGroupRelations = await ProductGroupRelations.findAll({
    //     where: {
    //       productId: product.id,
    //     }
    //   })
    //   const groupIdsAll = autoGroupRelations.map(el => el.productGroupId)
    //   const groups = !!groupIdsAll.length ? await ProductGroup.findAll({
    //     where: {
    //       id: groupIdsAll,
    //       catalog: 'AUTO_PARTS',
    //     }
    //   }) : []
    //   const groupIds = groups.map(el => el.id)

    //   for (const productGroupId of groupIds) {
    //     for (const autoTypeId of autoTypeIds) {
    //       await AutoTypeGroupRelations.findOrCreate({
    //         where: {
    //           autoTypeId,
    //           productGroupId,
    //         },
    //         defaults: {
    //           autoTypeId,
    //           productGroupId,
    //         },
    //       })
    //     }
    //     for (const autoBrandId of autoBrandIds) {
    //       await AutoBrandGroupRelations.findOrCreate({
    //         where: {
    //           autoBrandId,
    //           productGroupId,
    //         },
    //         defaults: {
    //           autoBrandId,
    //           productGroupId,
    //         },
    //       })
    //     }
    //   } */
    // }

    const endTime = new Date().getTime();
    console.log('CARS COUNT', a);

    console.log(`Number of duplicates = ${duplicatesCount}`);
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
