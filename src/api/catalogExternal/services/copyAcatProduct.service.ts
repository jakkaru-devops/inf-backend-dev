import { Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op, Sequelize, Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import { generateLabel } from '../../../utils/common.utils';
import { DEFAULT_CATALOG_SECTION, PRODUCT_CATEGORY_STATUSES, PRODUCT_STATUSES } from '../../catalog/data';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import AutoModel from '../../catalog/models/AutoModel.model';
import AutoType from '../../catalog/models/AutoType.model';
import CatalogSection from '../../catalog/models/CatalogSection.model';
import Product from '../../catalog/models/Product.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import { createAutoBrandService } from '../../catalog/services/createAutoBrand.service';
import { createAutoModelService } from '../../catalog/services/createAutoModel.service';
import { createProductGroupService } from '../../catalog/services/createProductGroup.service';
import UserRoles from '../../role/models/UserRoles.model';
import { ACAT_AUTO_TYPES } from '../data';
import catalogService from '../../catalog/catalog.service';

interface IProps {
  productData: {
    id: string;
    name: string;
    article: string;
    autoType: string;
    autoBrand: string;
    autoModel: string;
    group: string;
    subgroup: string;
  };
  authUserRole: UserRoles;
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  product: Product;
}

export const copyAcatProductService = async ({
  productData,
  authUserRole,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    let productName = productData.name;
    productName +=
      productData.autoModel.includes(`${productData.autoBrand} `) ||
      productData.autoModel.includes(`${productData.autoBrand}-`)
        ? ` ${productData.autoModel}`
        : ` ${productData.autoBrand} ${productData.autoModel}`;
    if (!productName.includes(productData.article)) {
      productName += ` ${productData.article}`;
    }

    let product = await Product.findOne({
      where: { name_ru: productName },
      transaction,
    });

    const catalogSection = await CatalogSection.findOne({
      where: { label: DEFAULT_CATALOG_SECTION.label },
      attributes: ['id'],
      transaction,
    });

    const defaultType = ACAT_AUTO_TYPES.find(type => type.acat === productData.autoType);
    const autoType = await AutoType.findOne({
      where: { label: defaultType.label },
      attributes: ['id'],
      transaction,
    });

    let autoBrand = await AutoBrand.findOne({
      where: {
        [Op.or]: [
          {
            label: Sequelize.where(Sequelize.fn('lower', Sequelize.col('label')), {
              [Op.eq]: generateLabel(productData.autoBrand).toLowerCase(),
            } as seq.LogicType),
          },
          {
            name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
              [Op.eq]: productData.autoBrand.toLowerCase(),
            } as seq.LogicType),
          },
        ],
      },
    });
    if (!autoBrand) {
      autoBrand = (
        await createAutoBrandService({
          status: PRODUCT_CATEGORY_STATUSES.COPIED,
          label: generateLabel(productData.autoBrand),
          catalogSectionId: catalogSection.id,
          locales: [{ language: 'ru', name: productData.autoBrand }],
          autoTypeIds: [autoType.id],
          res,
          transaction,
        })
      ).autoBrand;
    }

    let autoModel = await AutoModel.findOne({
      where: {
        [Op.or]: [
          {
            label: Sequelize.where(Sequelize.fn('lower', Sequelize.col('label')), {
              [Op.eq]: generateLabel(productData.autoModel).toLowerCase(),
            } as seq.LogicType),
          },
          {
            name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
              [Op.eq]: productData.autoModel.toLowerCase(),
            } as seq.LogicType),
          },
        ],
      },
    });
    if (!autoModel) {
      autoModel = (
        await createAutoModelService({
          status: PRODUCT_CATEGORY_STATUSES.COPIED,
          label: generateLabel(productData.autoModel),
          catalogSectionId: catalogSection.id,
          locales: [{ language: 'ru', name: productData.autoModel }],
          autoTypeId: autoType.id,
          autoBrandId: autoBrand.id,
          res,
          transaction,
        })
      ).autoModel;
    }

    let productGroup = await ProductGroup.findOne({
      where: {
        [Op.or]: [
          {
            label: Sequelize.where(Sequelize.fn('lower', Sequelize.col('label')), {
              [Op.eq]: generateLabel(productData.group)?.toLowerCase(),
            } as seq.LogicType),
          },
          {
            name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
              [Op.eq]: productData?.group?.toLowerCase(),
            } as seq.LogicType),
          },
        ],
      },
    });
    if (!productGroup && productData?.group) {
      productGroup = (
        await createProductGroupService({
          status: PRODUCT_CATEGORY_STATUSES.COPIED,
          label: generateLabel(productData.group),
          catalogSectionId: catalogSection.id,
          nestingLevel: 0,
          locales: [{ language: 'ru', name: productData.group }],
          parentId: null,
          catalog: 'AUTO_PARTS',
          autoTypeIds: [autoType?.id].filter(Boolean),
          autoBrandIds: [autoBrand?.id].filter(Boolean),
          res,
          transaction,
        })
      ).productGroup;
    }

    if (!product) {
      product = await catalogService.createProduct(
        {
          name: productName,
          description: null,
          status: PRODUCT_STATUSES.COPIED,
          article: productData.article,
          manufacturer: null,
          weight: null,
          length: null,
          width: null,
          height: null,
          files: [],
          acatProductId: productData.id,
          branches: [
            {
              isMain: true,
              tag: productName,
              description: null,
              manufacturer: null,
              autoTypeId: autoType.id,
              autoBrandId: autoBrand.id,
              autoModelIds: [autoModel.id],
              groupId: productGroup?.id,
              subgroupId: null,
            },
          ],
          authUserRole,
        },
        { transaction },
      );
    }

    return {
      product,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Товар не перенесен',
      error: err,
    });
  }
};
