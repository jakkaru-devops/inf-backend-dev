import { Request, Response } from 'express';
import httpStatus from 'http-status';
import fs from 'fs';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import {
  DEFAULT_AUTO_TYPES,
  DEFAULT_CATALOG_SECTION,
  PRODUCT_CATEGORY_STATUSES,
  PRODUCT_STATUSES,
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
import CatalogSection from '../../catalog/models/CatalogSection.model';
import ProductGroupRelations from '../../catalog/models/relations/ProductGroupRelations.model';

interface IProductData {
  name: string;
  article: string;
  additionalArticles: string[];
  additionalParams: object;
  orderCode: string;
  link: string;
  price: number;
  brand: string;
  manufacturer: string;
  description: string;
  params: {
    width: number;
    height: number;
    length: number;
    weight: number;
  };
  analogs: Array<{
    name: string;
    price: number;
    orderCode: string;
    brand: string;
    article: string;
    additionalArticle: string;
  }>;
  autoTypes: IAutoTypeData[];
  autoBrands: IAUtoBrandData[];
  groups: string[];
  groupsAvtozapchasti: string[];
  groupsAvtotovari: string[];
  groupsInstrument: string[];
  applicabilities: Array<{
    article: string;
    name: string;
    autoType: 'car' | 'engine' | 'tractor' | 'truck' | 'special';
    autoBrand: string;
    autoModel: string;
  }>;
  recommendedProducts: Array<{
    name: string;
    article: string;
    orderCode: string;
  }>;
  productCategories: any;
}

interface IAutoTypeData {
  name: string;
  autoBrands: IAUtoBrandData[];
}

interface IAUtoBrandData {
  name: string;
  autoModels: Array<{
    name: string;
  }>;
}

export const updateProductWithParsedDataService = async (req: Request, res: Response) => {
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

    const catalogSection = await CatalogSection.findOne({
      where: {
        label: DEFAULT_CATALOG_SECTION.label,
      },
    });

    // Products
    console.log('Products updating...');
    let PRODUCTS_LENGTH = 0;
    const PRODUCTS_FILE_NAMES = fs.readdirSync(ALL_PRODUCTS_FOLDER);

    // Get products length
    for (const PRODUCTS_FILE_NAME of PRODUCTS_FILE_NAMES) {
      const path = ALL_PRODUCTS_FOLDER + '/' + PRODUCTS_FILE_NAME;
      const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(path) as any);
      PRODUCTS_LENGTH += PRODUCTS.length;
    }
    console.log('TOTAL PRODUCTS LENGTH =', PRODUCTS_LENGTH);

    // Create products
    let i = PRODUCTS_LENGTH;
    for (const PRODUCTS_FILE_NAME of PRODUCTS_FILE_NAMES) {
      const path = ALL_PRODUCTS_FOLDER + '/' + PRODUCTS_FILE_NAME;
      const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(path) as any);

      for (const productData of PRODUCTS) {
        const productEntity = await Product.findOne({
          where: {
            article: productData.article,
            name_ru: productData.name,
          },
          include: [
            {
              model: AutoType,
              as: 'autoTypes',
            },
            {
              model: AutoBrand,
              as: 'autoBrands',
            },
          ],
        });
        if (!productEntity) continue;

        const allProductGroups: ProductGroup[] = [];
        const groupArrays: Array<{ catalogName: ProductGroup['catalog']; list: string[] }> = [
          {
            catalogName: 'AUTO_PARTS',
            list: [...(productData?.groups || productData?.groupsAvtozapchasti || []).filter(el => !!el?.length)],
          },
          {
            catalogName: 'AUTO_PRODUCTS',
            list: [...(productData?.groupsAvtotovari || []).filter(el => !!el?.length)],
          },
          {
            catalogName: 'AUTO_TOOLS',
            list: [...(productData?.groupsInstrument || []).filter(el => !!el?.length)],
          },
        ];
        for (const { catalogName, list } of groupArrays) {
          const catalogGroups: ProductGroup[] = [];
          for (let i = 0; i < list.length; i++) {
            const groupName = list[i];
            if (!groupName?.trim()?.length) continue;

            const { productGroup: groupEntity } = await createProductGroupService({
              status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
              label: generateLabel(groupName),
              catalogSectionId: catalogSection.id,
              nestingLevel: i,
              locales: [{ language: 'ru', name: groupName }],
              parentId: i > 0 ? catalogGroups[i - 1].id : null,
              catalog: catalogName,
              autoTypeIds: productEntity.autoTypes.map(el => el.id),
              autoBrandIds: productEntity.autoBrands.map(el => el.id),
              res,
            });
            catalogGroups.push(groupEntity);
          }
          allProductGroups.push(...catalogGroups);
        }

        for (const group of allProductGroups) {
          await ProductGroupRelations.findOrCreate({
            where: {
              productId: productEntity.id,
              productGroupId: group.id,
            },
            defaults: {
              productId: productEntity.id,
              productGroupId: group.id,
            },
          });
          /* for (const autoType of productEntity.autoTypes) {
            await AutoTypeGroupRelations.findOrCreate({
              where: {
                autoTypeId: autoType.id,
                productGroupId: group.id,
              },
              defaults: {
                autoTypeId: autoType.id,
                productGroupId: group.id,
              },
            });
          }
          for (const autoBrand of productEntity.autoBrands) {
            await AutoBrandGroupRelations.findOrCreate({
              where: {
                autoBrandId: autoBrand.id,
                productGroupId: group.id,
              },
              defaults: {
                autoBrandId: autoBrand.id,
                productGroupId: group.id,
              },
            });
          } */
        }

        i--;
        console.log(`${i} products remaining. Product ${productData.article} updated`);
      }
    }

    const endTime = new Date().getTime();

    console.log(`Products update took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Products updated successfully',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while products update',
      error: err,
    });
  }
};
