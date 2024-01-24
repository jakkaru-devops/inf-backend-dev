import { Request, Response } from 'express';
import httpStatus from 'http-status';
import fs from 'fs';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import {
  DEFAULT_AUTO_TYPES,
  DEFAULT_CATALOG_SECTION,
  PRODUCT_CATEGORY_STATUSES,
  PRODUCT_STATUSES,
} from '../../catalog/data';
import { createAutoTypeService } from '../../catalog/services/createAutoType.service';
import { createCatalogSectionService } from '../../catalog/services/createCatalogSection.service';
import { ALL_PRODUCTS_FOLDER } from '../data';
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
import { getAutoTypeName } from '../../catalog/utils';
import catalogService from '../../catalog/catalog.service';

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

export const runCatalogInitService = async (req: Request, res: Response) => {
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

    // Catalog default section
    console.log('Default catalog section creating...');
    const { catalogSection } = await createCatalogSectionService({
      ...DEFAULT_CATALOG_SECTION,
      res,
    });

    // Auto types
    console.log('Auto types creating...');
    for (const item of DEFAULT_AUTO_TYPES) {
      await createAutoTypeService({
        ...item,
        catalogSectionId: catalogSection.id,
        res,
      });
    }
    const autoTypes = (await AutoType.findAll()).map(el => el.toJSON() as AutoType);

    // Products
    console.log('Products creating...');
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
        const autoBrands: AutoBrand[] = [];
        const autoModels: AutoModel[] = [];
        const groups: ProductGroup[] = [];

        // Firstly get or create all product groups of the product
        const groupArrays: Array<{ catalogName: ProductGroup['catalog']; list: string[] }> = [
          {
            catalogName: 'AUTO_PARTS',
            list: [
              ...new Set((productData?.groups || productData?.groupsAvtozapchasti || []).filter(el => !!el?.length)),
            ],
          },
          {
            catalogName: 'AUTO_PRODUCTS',
            list: [...new Set((productData?.groupsAvtotovari || []).filter(el => !!el?.length))],
          },
          {
            catalogName: 'AUTO_TOOLS',
            list: [...new Set((productData?.groupsInstrument || []).filter(el => !!el?.length))],
          },
        ];
        for (const { catalogName, list } of groupArrays) {
          for (let i = 0; i < list.length; i++) {
            const groupName = list[i];
            if (!groupName?.trim()?.length) continue;

            const { productGroup: groupEntity } = await createProductGroupService({
              status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
              label: generateLabel(groupName),
              catalogSectionId: catalogSection.id,
              nestingLevel: i,
              locales: [{ language: 'ru', name: groupName }],
              parentId: i > 0 ? groups[i - 1].id : null,
              catalog: catalogName,
              autoTypeIds: [],
              autoBrandIds: [],
              res,
            });
            if (!groups.find(entity => entity.name_ru === groupName)) {
              groups.push(groupEntity);
            }
          }
        }

        // Then get or create all auto brands with their models of the product
        for (const autoTypeData of productData.autoTypes || []) {
          const autoTypeEntity = autoTypes.find(entity => entity.name_ru === getAutoTypeName(autoTypeData.name));

          for (const autoBrandData of autoTypeData.autoBrands || []) {
            const { autoBrand: autoBrandEntity } = await createAutoBrandService({
              status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
              label: generateLabel(autoBrandData.name),
              catalogSectionId: catalogSection.id,
              locales: [{ language: 'ru', name: autoBrandData.name }],
              autoTypeIds: [autoTypeEntity.id],
              res,
            });
            autoBrands.push(autoBrandEntity);

            for (const autoModelData of autoBrandData.autoModels || []) {
              if (!autoModelData?.name?.trim()?.length) continue;
              const { autoModel: autoModelEntity } = await createAutoModelService({
                status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
                label: generateLabel(autoModelData.name),
                catalogSectionId: catalogSection.id,
                locales: [{ language: 'ru', name: autoModelData.name }],
                autoTypeId: autoTypeEntity.id,
                autoBrandId: autoBrandEntity.id,
                res,
              });
              autoModels.push(autoModelEntity);
            }

            // After brand and its models created it's turn to create relations of autoTypes, brands and groups
            for (const groupEntity of groups) {
              if (groupEntity.catalog !== 'AUTO_PARTS') continue;
              await AutoTypeGroupRelations.findOrCreate({
                where: {
                  autoTypeId: autoTypeEntity.id,
                  productGroupId: groupEntity.id,
                },
                defaults: {
                  autoTypeId: autoTypeEntity.id,
                  productGroupId: groupEntity.id,
                },
              });
              await AutoBrandGroupRelations.findOrCreate({
                where: {
                  autoBrandId: autoBrandEntity.id,
                  productGroupId: groupEntity.id,
                },
                defaults: {
                  autoBrandId: autoBrandEntity.id,
                  productGroupId: groupEntity.id,
                },
              });
            }
          }
        }

        await catalogService.createProduct(
          {
            status: PRODUCT_STATUSES.DEFAULT,
            article: productData.article,
            additionalArticles: (productData.additionalArticles || []).filter(el => !!el?.length),
            code: productData.orderCode,
            manufacturer: productData?.manufacturer || productData?.brand,
            width: productData?.params?.width ? productData?.params?.width * 1000 : null,
            height: productData?.params?.height ? productData?.params?.height * 1000 : null,
            length: productData?.params?.length ? productData?.params?.length * 1000 : null,
            weight: productData?.params?.weight,
            params: productData.additionalParams,
            files: [],
            branches: [
              {
                isMain: true,
                tag: productData?.name,
                description: null,
                manufacturer: null,
                autoTypeId: null,
                autoBrandId: null,
                autoModelIds: null,
                groupId: null,
                subgroupId: null,
              },
            ],
            analogs: {
              added: [],
              deleted: [],
            },
            applicabilities: {
              added: (productData.applicabilities || [])
                .filter(item => !!item?.name?.trim()?.length)
                .map(item => ({
                  article: item.article,
                  name: item.article,
                  autoType: item.autoType,
                  autoBrand: item.autoBrand,
                  autoModel: item.autoModel,
                })),
              updated: [],
              deleted: [],
            },
            authUserRole: null,
          },
          { transaction: null },
        );

        console.log(`Product ${productData.article} created`);
        i--;
        console.log(`${i} products remaining`);
      }
    }

    // Iterate PRODUCTS again to create analogs & recommendedProducts to each created product
    i = PRODUCTS_LENGTH;
    for (const PRODUCTS_FILE_NAME of PRODUCTS_FILE_NAMES) {
      const path = ALL_PRODUCTS_FOLDER + '/' + PRODUCTS_FILE_NAME;
      const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(path) as any);

      for (const productData of PRODUCTS) {
        const productEntity = await Product.findOne({
          where: {
            code: productData.orderCode,
          },
        });
        if (!productEntity) continue;

        // Analogs
        for (const analogProductData of productData.analogs || []) {
          const analogProductEntity = await Product.findOne({
            where: {
              code: analogProductData.orderCode,
            },
          });
          if (!analogProductEntity) continue;

          await ProductAnalogs.findOrCreate({
            where: {
              productId: productEntity.id,
              analogId: analogProductEntity.id,
            },
            defaults: {
              productId: productEntity.id,
              analogId: analogProductEntity.id,
            },
          });

          console.log(`Analog ${analogProductEntity.id} created for product ${productEntity.id}`);
        }

        // Recommended products
        for (const recommendedProductData of productData.recommendedProducts || []) {
          const recommendedProductEntity = await Product.findOne({
            where: {
              code: recommendedProductData.orderCode,
            },
          });
          if (!recommendedProductEntity) continue;

          await RecommendedProducts.findOrCreate({
            where: {
              productId: productEntity.id,
              recommendedProductId: recommendedProductEntity.id,
            },
            defaults: {
              productId: productEntity.id,
              recommendedProductId: recommendedProductEntity.id,
            },
          });

          console.log(`Recommended product ${recommendedProductEntity.id} created for product ${productEntity.id}`);
        }
        i--;
        console.log(`${i} products remaining for analogs and recommended products`);
      }
    }

    const endTime = new Date().getTime();

    console.log(`Products transfer took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'The products catalog has been successfully initialized',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while catalog initialization',
      error: err,
    });
  }
};
