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
import { executeTransaction } from '../../../utils/transactions.utils';
import path from 'path';
import appRoot from 'app-root-path';

interface IProductGroupData {
  name: string;
  subgroups: IProductGroupData[];
}

export const addProductGroupsService = async (req: Request, res: Response) => {
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

    const AUTO_PARTS: IProductGroupData[] = JSON.parse(
      fs.readFileSync(path.join(appRoot + '/_init/groupsAvtozapchasti.json')) as any,
    );
    const AUTO_PRODUCTS: IProductGroupData[] = JSON.parse(
      fs.readFileSync(path.join(appRoot + '/_init/groupsAvtotovari.json')) as any,
    );
    const AUTO_TOOLS: IProductGroupData[] = JSON.parse(
      fs.readFileSync(path.join(appRoot + '/_init/groupsInstrument.json')) as any,
    );

    const catalogSection = await CatalogSection.findOne();

    const createProductGroup = async (data: {
      groupData: IProductGroupData;
      nestingLevel: number;
      parentId: string;
      catalog: ProductGroup['catalog'];
    }) => {
      const createdGroup = await ProductGroup.create({
        ...data,
        label: generateLabel(data.groupData.name),
        name_ru: data.groupData.name,
        status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
        isHidden: false,
        catalogSectionId: catalogSection.id,
      });
      console.log(
        `Created group - ${data.groupData.name}, nestingLevel - ${data.nestingLevel}, parentId - ${data.parentId}`,
      );
      if (data?.groupData?.subgroups) {
        for (const childGroupData of data?.groupData?.subgroups) {
          createProductGroup({
            groupData: childGroupData,
            nestingLevel: data.nestingLevel + 1,
            parentId: createdGroup.id,
            catalog: data.catalog,
          });
        }
      }
    };

    for (const groupData of AUTO_PARTS) {
      await createProductGroup({
        groupData,
        nestingLevel: 0,
        parentId: null,
        catalog: 'AUTO_PARTS',
      });
    }
    for (const groupData of AUTO_PRODUCTS) {
      await createProductGroup({
        groupData,
        nestingLevel: 0,
        parentId: null,
        catalog: 'AUTO_PRODUCTS',
      });
    }
    for (const groupData of AUTO_TOOLS) {
      await createProductGroup({
        groupData,
        nestingLevel: 0,
        parentId: null,
        catalog: 'AUTO_TOOLS',
      });
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
