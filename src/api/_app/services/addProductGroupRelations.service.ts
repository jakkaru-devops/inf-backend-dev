import { Request, Response } from 'express';
import httpStatus from 'http-status';
import fs from 'fs';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { DEFAULT_AUTO_TYPES, DEFAULT_CATALOG_SECTION, PRODUCT_STATUSES } from '../../catalog/data';
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

export const addProductGroupRelationsService = async (req: Request, res: Response) => {
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

    const autoTypes = (await AutoType.findAll()).map(el => el.toJSON() as AutoType);

    const getAutoTypeName = (name: string) => {
      switch (name) {
        case 'Отечественные грузовики':
        case 'Европейские грузовики':
        case 'Корейские грузовики':
        case 'Грузовики':
          return 'Грузовые';
        case 'Легковые автомобили':
          return 'Легковые';
        case 'Тракторы и спецтехника':
          return 'Спецтехника';
        case 'Автобусы':
          return 'Автобусы';
        case 'Коммерческий транспорт':
          return 'Коммерческий';
        case 'Полуприцепы и оси':
          return 'Прицепы';
        default:
          return name;
      }
    };

    // Products
    console.log('Products handling...');
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
    await Promise.all(
      PRODUCTS_FILE_NAMES.map(async PRODUCTS_FILE_NAME => {
        const path = ALL_PRODUCTS_FOLDER + '/' + PRODUCTS_FILE_NAME;
        const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(path) as any);

        for (const productData of PRODUCTS) {
          const allProductGroups: ProductGroup[] = [];

          const productEntity = await Product.findOne({
            where: {
              article: productData.article,
              code: productData.orderCode,
              name_ru: productData.name,
            },
          });
          if (!productEntity) {
            throw APIError({
              res,
              status: httpStatus.INTERNAL_SERVER_ERROR,
              message: `Товар ${productData.article} ${productData.name} не найден в БД`,
            });
          }

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
          for (let { catalogName, list } of groupArrays) {
            if (catalogName === 'AUTO_PARTS' && list.length > 2) {
              list[1] = list.filter((el, j) => j > 0).join(', ');
              list = list.filter((el, j) => j <= 1);
            }
            console.log(`${productData.article} ${productData.name}`, list);
            const localGroups: ProductGroup[] = [];
            for (let i = 0; i < list.length; i++) {
              const groupName = list[i].replace(/  +/g, ' ');
              if (!groupName?.trim()?.length) continue;

              const groupEntities = await ProductGroup.findAll({
                where: {
                  name_ru: groupName,
                  catalog: catalogName,
                },
                order: [['nestingLevel', 'ASC']],
              });
              if (!groupEntities?.length) {
                throw APIError({
                  res,
                  status: httpStatus.INTERNAL_SERVER_ERROR,
                  message: `Группа ${groupName} nestingLevel - ${i} parentId - ${
                    i > 0 ? localGroups[i - 1].id : null
                  } не найдена`,
                });
              }
              let groupEntity: ProductGroup = null;
              if (groupEntities.length > 1) {
                const includedSameGroupsNumber = localGroups.filter(el => el.name_ru === groupName).length;
                groupEntity = groupEntities[includedSameGroupsNumber];
              } else {
                groupEntity = groupEntities[0];
              }

              // console.log(groupEntity, groupEntities.length);

              localGroups.push(groupEntity);
              if (!allProductGroups.find(entity => entity.name_ru === groupName)) {
                allProductGroups.push(groupEntity);
              }
            }
          }

          // Then get or create all auto brands with their models of the product
          for (const autoTypeData of productData.autoTypes || []) {
            const autoTypeEntity = autoTypes.find(entity => entity.name_ru === getAutoTypeName(autoTypeData.name));

            for (const autoBrandData of autoTypeData.autoBrands || []) {
              const autoBrandEntity = await AutoBrand.findOne({
                where: {
                  label: generateLabel(autoBrandData.name),
                  name_ru: autoBrandData.name,
                },
              });

              // After brand and its models created it's turn to create relations of autoTypes, brands and groups
              for (const groupEntity of allProductGroups) {
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

          // product relations
          for (const groupEntity of allProductGroups) {
            await ProductGroupRelations.findOrCreate({
              where: {
                productId: productEntity.id,
                productGroupId: groupEntity.id,
              },
              defaults: {
                productId: productEntity.id,
                productGroupId: groupEntity.id,
              },
            });
          }

          console.log(`Product ${productData.article} handled`);
          i--;
          console.log(`${i} products remaining`);
        }
      }),
    );

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
