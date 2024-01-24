import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import fs from 'fs';
import FileModel from '../../files/models/File.model';
import Product from '../models/Product.model';
import { UPLOAD_FILES_DIRECTORY } from '../../../config/env';
import { createDir } from '../../files/utils';
import ProductFile from '../models/ProductFile.model';
import {
  getBranchesCategoriesJson,
  getProductDirectoryPath,
  simplifyProductArticle,
  simplifyProductName,
} from '../utils';
import ProductSectionRelations from '../models/relations/ProductSectionRelations.model';
import ProductAutoTypeRelations from '../models/relations/ProductAutoTypeRelations.model';
import ProductAutoBrandRelations from '../models/relations/ProductAutoBrandRelations.model';
import ProductAutoModelRelations from '../models/relations/ProductAutoModelRelations.model';
import ProductGroupRelations from '../models/relations/ProductGroupRelations.model';
import { ICreateProductDto } from '../interfaces/dto';
import { validateProductData } from '../validations/product.validation';
import ProductAnalogs from '../models/ProductAnalogs.model';
import ProductApplicability from '../models/ProductApplicability.model';
import { stripString } from '../../../utils/common.utils';
import _ from 'lodash';
import { DEFAULT_CATALOG_SECTION, PRODUCT_STATUSES, PUBLIC_PRODUCT_STATUSES } from '../data';
import ProductBranch from '../models/ProductBranch.model';
import CatalogSection from '../models/CatalogSection.model';
import AutoType from '../models/AutoType.model';
import AutoBrand from '../models/AutoBrand.model';
import { checkAndHideAutoBrandService } from './checkAndHideAutoBrand.service';
import UserRoles from '../../role/models/UserRoles.model';
import { ServiceError } from '../../../core/utils/serviceError';
import catalogService from '../catalog.service';

interface IProps extends ICreateProductDto {
  authUserRole: UserRoles;
  sourceProductId?: Product['id'];
}

export const createProductService = async (
  { authUserRole, ...props }: IProps,
  { transaction }: { transaction: Transaction },
): Promise<Product> => {
  try {
    await validateProductData({ data: props, action: 'create' });

    const {
      userId,
      status,
      article,
      additionalArticles,
      code,
      manufacturer,
      width,
      height,
      length,
      weight,
      params,
      files,
      previewFileId,
      acatProductId,
      laximoProductId,
      name,
      description,
      isExternalProduct,
      branches,
      analogs,
      applicabilities,
      sourceProductId,
    } = props;

    const cats = {
      autoTypeIds: _.uniq(branches.map(branch => branch?.autoTypeId).filter(Boolean)),
      autoBrandIds: _.uniq(branches.map(branch => branch?.autoBrandId).filter(Boolean)),
      autoModelIds: _.uniq(branches.flatMap(branch => branch?.autoModelIds || []).filter(Boolean)),
      groupIds: _.uniq(branches.map(branch => branch?.groupId).filter(Boolean)),
      subgroupIds: _.uniq(branches.map(branch => branch?.subgroupId).filter(Boolean)),
    };

    const tagsJson = _.uniq(
      [name.trim()]
        .concat(branches.map(branch => branch?.tag?.trim()))
        .filter(Boolean)
        .map(tag => simplifyProductName(tag, article)),
    );

    let product = await Product.create(
      {
        status,
        article: stripString(article),
        articleSimplified: simplifyProductArticle(article),
        additionalArticles: null,
        code: null,
        name_ru: name,
        nameSimplified: simplifyProductName(name, article),
        description_ru: description,
        manufacturer: stripString(manufacturer),
        width,
        height,
        weight,
        length,
        params,
        isExternalProduct: false,
        acatProductId: null,
        laximoProductId: null,
        previewFileId: files?.[0]?.id,
        autoTypeIds: JSON.stringify(cats.autoTypeIds),
        autoBrandIds: JSON.stringify(cats.autoBrandIds),
        autoModelIds: JSON.stringify(cats.autoModelIds),
        groupIds: JSON.stringify(cats.groupIds),
        subgroupIds: JSON.stringify(cats.subgroupIds),
        hasApplicabilities: !!applicabilities?.added?.length,
        hasAnalogs: !!analogs?.added?.length,
        branchCategoriesJson: '',
        tagsJson: JSON.stringify(tagsJson),
        sourceProductId,
        userId,
      },
      {
        transaction,
      },
    );
    let allProductAutoTypeIds: string[] = [];
    let allProductAutoBrandIds: string[] = [];

    if (!branches?.length) {
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: 'Необходима минимум одна ветка для товара',
      });
    }
    if (branches?.length === 1) {
      branches[0].isMain = true;
    }

    const branchesEntities: ProductBranch[] = [];
    for (const branchData of branches) {
      if (!!branchData?.autoTypeId) allProductAutoTypeIds.push(branchData?.autoTypeId);
      if (!!branchData?.autoBrandId) allProductAutoBrandIds.push(branchData?.autoBrandId);

      const newBranch = await catalogService.createProductBranch(
        {
          productId: product.id,
          userId,
          sourceBranchId: status === PRODUCT_STATUSES.REVIEW ? branchData?.sourceBranchId : null,
          status,
          isMain: branchData.isMain,
          name,
          tag: branchData?.tag,
          description: branchData?.description,
          manufacturer,
          autoTypeId: branchData?.autoTypeId,
          autoBrandId: branchData?.autoBrandId,
          autoModelIds: branchData?.autoModelIds,
          groupId: branchData?.groupId,
          subgroupId: branchData?.subgroupId,
          article: product.article,
          articleSimplified: product.articleSimplified,
        },
        { transaction },
      );
      branchesEntities.push(newBranch);
    }

    const catalogSection = await CatalogSection.findOne({
      where: { label: DEFAULT_CATALOG_SECTION.label },
      transaction,
    });

    const categories: Array<{ items: string[]; model: any; keyProp: string }> = [
      { items: [catalogSection.id], model: ProductSectionRelations, keyProp: 'sectionId' },
      { items: cats.autoTypeIds, model: ProductAutoTypeRelations, keyProp: 'autoTypeId' },
      { items: cats.autoBrandIds, model: ProductAutoBrandRelations, keyProp: 'autoBrandId' },
      { items: cats.autoModelIds, model: ProductAutoModelRelations, keyProp: 'autoModelId' },
      { items: [...cats.groupIds, ...cats.subgroupIds], model: ProductGroupRelations, keyProp: 'productGroupId' },
    ];
    for (const { items, model, keyProp } of categories) {
      for (const item of items) {
        await model.findOrCreate({
          where: {
            productId: product.id,
            [keyProp]: item,
          },
          defaults: {
            productId: product.id,
            [keyProp]: item,
          },
          transaction,
        });
      }
    }

    if (!!applicabilities) {
      for (const item of applicabilities?.added || []) {
        await ProductApplicability.create(
          {
            productId: product.id,
            autoTypeId: item.autoTypeId,
            autoBrandId: item.autoBrandId,
            autoBrandName: !item.autoBrandId ? item.autoBrandName : null,
            autoModelId: item.autoModelId,
            autoModelName: !item.autoModelId ? item.autoModelName : null,
            article: item.article,
          },
          {
            transaction,
          },
        );
      }
    }

    if (analogs) {
      for (const analogId of _.uniq(analogs?.added || [])) {
        await ProductAnalogs.create(
          {
            productId: product.id,
            analogId,
          },
          {
            transaction,
          },
        );
        await ProductAnalogs.create(
          {
            productId: analogId,
            analogId: product.id,
          },
          {
            transaction,
          },
        );
      }
    }

    const branchEntities = await ProductBranch.findAll({
      where: {
        productId: product.id,
        status: PUBLIC_PRODUCT_STATUSES.concat(PRODUCT_STATUSES.SALE),
      },
      transaction,
    });
    const branchCategoriesJson = JSON.stringify(getBranchesCategoriesJson(branchEntities));

    product = await product.update({ branchCategoriesJson }, { transaction });

    // Sale
    if (product.status === PRODUCT_STATUSES.SALE) {
      await catalogService.updateCategoriesForSale({
        ...cats,
        transaction,
      });
    }

    if (authUserRole?.role?.label === 'moderator') {
      allProductAutoTypeIds = _.uniq(allProductAutoTypeIds.filter(Boolean));
      allProductAutoBrandIds = _.uniq(allProductAutoBrandIds.filter(Boolean));
      const allAutoTypes = await AutoType.findAll({
        where: { id: allProductAutoTypeIds },
        attributes: ['id'],
        transaction,
      });
      const allProductAutoBrands = await AutoBrand.findAll({ where: { id: allProductAutoBrandIds }, transaction });
      for (const autoBrand of allProductAutoBrands) {
        await checkAndHideAutoBrandService(
          {
            autoBrand,
            autoTypeIds: allAutoTypes.map(el => el.id),
            excludeProductId: null,
            excludeProductIdAutoTypes: [],
          },
          { transaction },
        );
      }
    }

    const productFiles: ProductFile[] = [];
    const actualDirPath = getProductDirectoryPath(product.id, 'actual');

    if (files.length > 0) {
      if (!fs.existsSync(actualDirPath)) {
        const newDir = await createDir(actualDirPath);
        if (!newDir) {
          throw new ServiceError({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Директория для хранения файлов товара не создана',
            error: newDir as any,
          });
        }
      }

      const fileEntities = await FileModel.findAll({
        where: {
          id: files.map(el => el.id),
        },
        transaction,
      });

      // Update, move unknown files and create ProductFile entities
      for (const fileEntity of fileEntities) {
        const oldPath = `${UPLOAD_FILES_DIRECTORY}/${fileEntity.path}`;
        const newDBPath = `${getProductDirectoryPath(product.id, 'db')}/${fileEntity.name}`;
        const newActualPath = `${UPLOAD_FILES_DIRECTORY}/${newDBPath}`;

        // Update file path
        await FileModel.update(
          {
            path: newDBPath,
          },
          {
            where: {
              id: fileEntity.id,
            },
            transaction,
          },
        );
        // Create product file
        const productFile = await ProductFile.create(
          {
            productId: product.id,
            fileId: fileEntity.id,
          },
          { transaction },
        );
        productFiles.push(productFile);

        // Move file from old path to new path
        await fs.promises.rename(oldPath, newActualPath);
      }
    }

    product.productFiles = productFiles;

    return product;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка. Товар не добавлен',
      error: err,
    });
  }
};
