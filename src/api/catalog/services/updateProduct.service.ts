import { Response } from 'express';
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
import { IUpdateProductDto } from '../interfaces/dto';
import CatalogSection from '../models/CatalogSection.model';
import AutoType from '../models/AutoType.model';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import ProductGroup from '../models/ProductGroup.model';
import ProductSectionRelations from '../models/relations/ProductSectionRelations.model';
import ProductAutoTypeRelations from '../models/relations/ProductAutoTypeRelations.model';
import ProductAutoBrandRelations from '../models/relations/ProductAutoBrandRelations.model';
import ProductGroupRelations from '../models/relations/ProductGroupRelations.model';
import { Model } from 'sequelize-typescript';
import ProductAutoModelRelations from '../models/relations/ProductAutoModelRelations.model';
import { APIError } from '../../../utils/api.utils';
import { validateProductData } from '../validations/product.validation';
import ProductAnalogs from '../models/ProductAnalogs.model';
import ProductApplicability from '../models/ProductApplicability.model';
import { checkAndHideAutoBrandService } from './checkAndHideAutoBrand.service';
import UserRoles from '../../role/models/UserRoles.model';
import _ from 'lodash';
import ProductBranch from '../models/ProductBranch.model';
import { PRODUCT_STATUSES, PUBLIC_PRODUCT_STATUSES } from '../data';
import { deleteProductBranchService } from './deleteProductBranch.service';
import catalogService from '../catalog.service';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps extends IUpdateProductDto {
  authUserRole: UserRoles;
}

export const updateProductService = async (
  { authUserRole, ...props }: IProps,
  { transaction }: { transaction: Transaction },
): Promise<Product> => {
  try {
    await validateProductData({ data: props, action: 'update' });

    const {
      userId,
      id,
      status,
      article,
      additionalArticles,
      code,
      manufacturer,
      weight,
      length,
      width,
      height,
      params,
      files,
      previewFileId,
      name,
      description,
      branches,
      analogs,
      applicabilities,
    } = props;

    const cats = {
      autoTypeIds: _.uniq(branches.map(branch => branch?.autoTypeId).filter(Boolean)),
      autoBrandIds: _.uniq(branches.map(branch => branch?.autoBrandId).filter(Boolean)),
      autoModelIds: _.uniq(branches.flatMap(branch => branch?.autoModelIds || []).filter(Boolean)),
      groupIds: _.uniq(branches.map(branch => branch?.groupId).filter(Boolean)),
      subgroupIds: _.uniq(branches.map(branch => branch?.subgroupId).filter(Boolean)),
    };

    let product = await Product.findByPk(id, {
      transaction,
    });
    let allProductAutoTypeIds: string[] = [];
    let allProductAutoBrandIds: string[] = [];

    const tagsJson = _.uniq(
      [name.trim()]
        .concat(branches.map(branch => branch?.tag?.trim()))
        .filter(Boolean)
        .map(tag => simplifyProductName(tag, article)),
    );

    product = await product.update(
      {
        status,
        article,
        articleSimplified: simplifyProductArticle(article),
        name_ru: name,
        nameSimplified: simplifyProductName(name, article),
        description_ru: description,
        manufacturer,
        width,
        height,
        weight,
        length,
        params,
        previewFileId: files?.[0]?.id,
        autoTypeIds: JSON.stringify(cats.autoTypeIds),
        autoBrandIds: JSON.stringify(cats.autoBrandIds),
        autoModelIds: JSON.stringify(cats.autoModelIds),
        groupIds: JSON.stringify(cats.groupIds),
        subgroupIds: JSON.stringify(cats.subgroupIds),
        tagsJson: JSON.stringify(tagsJson),
      },
      { transaction },
    );

    let branchEntities = await ProductBranch.findAll({
      where: {
        productId: product.id,
      },
      transaction,
    });
    allProductAutoTypeIds = allProductAutoTypeIds.concat(branchEntities.map(el => el?.autoTypeId));
    allProductAutoBrandIds = allProductAutoBrandIds.concat(branchEntities.map(el => el?.autoBrandId));

    // const branchesEntities: ProductBranch[] = [];
    for (const branchData of branches) {
      if (!!branchData?.autoTypeId) allProductAutoTypeIds.push(branchData?.autoTypeId);
      if (!!branchData?.autoBrandId) allProductAutoBrandIds.push(branchData?.autoBrandId);
      if (!branchData?.id) {
        await catalogService.createProductBranch(
          {
            productId: product.id,
            userId,
            sourceBranchId: product.status === PRODUCT_STATUSES.REVIEW ? branchData?.id : null,
            status: product.status,
            isMain: false,
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
      } else {
        if (!branchEntities.find(el => el.id === branchData?.id)) continue;
        await catalogService.updateProductBranch(
          {
            status: product.status,
            branchId: branchData?.id,
            isMain: branches?.filter(el => el.isMain)?.length === 1 ? branchData?.isMain : undefined,
            tag: branchData.isMain ? name : branchData?.tag,
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
      }
    }
    for (const branchEntity of branchEntities) {
      if (!!branches.find(el => el.id === branchEntity.id || el?.sourceBranchId === branchEntity.id)) continue;
      await catalogService.deleteProductBranch(
        {
          branchId: branchEntity.id,
        },
        { transaction },
      );
    }

    const catalogSection = await CatalogSection.findOne({ transaction });
    const autoTypeIds: string[] = JSON.parse(product.autoTypeIds);
    const autoTypeEntities = await AutoType.findAll({
      where: {
        id: autoTypeIds,
      },
      transaction,
    });
    product.autoTypes = autoTypeEntities;

    const autoBrandIds: string[] = JSON.parse(product.autoBrandIds);
    const autoBrandEntities = await AutoBrand.findAll({
      where: {
        id: autoBrandIds,
      },
      transaction,
    });
    product.autoBrands = autoBrandEntities;

    const autoModelIds: string[] = JSON.parse(product.autoModelIds);
    const autoModelEntities = await AutoModel.findAll({
      where: {
        id: autoModelIds,
      },
      transaction,
    });
    product.autoModels = autoModelEntities;

    const productGroupIds = (JSON.parse(product.groupIds) as string[]).concat(
      JSON.parse(product.subgroupIds) as string[],
    );
    const productGroups = await ProductGroup.findAll({
      where: {
        id: productGroupIds,
      },
      transaction,
    });
    product.groups = productGroups;

    const categories: Array<{ items: string[]; entities: Model[]; model: any; keyProp: string }> = [
      {
        items: [catalogSection.id],
        entities: [catalogSection],
        model: ProductSectionRelations,
        keyProp: 'sectionId',
      },
      {
        items: cats.autoTypeIds,
        entities: product.autoTypes,
        model: ProductAutoTypeRelations,
        keyProp: 'autoTypeId',
      },
      {
        items: cats.autoBrandIds,
        entities: product.autoBrands,
        model: ProductAutoBrandRelations,
        keyProp: 'autoBrandId',
      },
      {
        items: cats.autoModelIds,
        entities: product.autoModels,
        model: ProductAutoModelRelations,
        keyProp: 'autoModelId',
      },
      {
        items: [...cats.groupIds, ...cats.subgroupIds],
        entities: product.groups,
        model: ProductGroupRelations,
        keyProp: 'productGroupId',
      },
    ];

    for (const { items, entities, model, keyProp } of categories) {
      if (!items) continue;

      for (const itemId of items) {
        const id = entities.find(({ id }) => id === itemId)?.id;
        const relationEntity = !!id
          ? await model.findOne({
              where: {
                [keyProp]: entities.find(({ id }) => id === itemId)?.id,
                productId: product.id,
              },
              transaction,
            })
          : null;

        if (!relationEntity) {
          await model.create(
            {
              productId: product.id,
              [keyProp]: itemId,
            },
            { transaction },
          );
        }
        if (authUserRole.role.label === 'moderator' && keyProp === 'autoBrandId') {
          await AutoBrand.update(
            {
              isHidden: false,
            },
            {
              where: {
                id: itemId,
              },
              transaction,
            },
          );
        }
      }

      for (const entity of entities) {
        // find product category entity
        const relationEntity = await model.findOne({
          where: {
            [keyProp]: entity.id,
            productId: product.id,
          },
          transaction,
        });
        if (!!items.find(itemId => itemId === relationEntity?.[keyProp])) continue; // if entity is included to request data

        await relationEntity.destroy({
          force: true,
          transaction,
        });
      }
    }

    if (!!applicabilities) {
      for (const item of applicabilities?.added || []) {
        await ProductApplicability.create(
          {
            id: item.id,
            productId: product.id,
            autoTypeId: item.autoTypeId,
            autoBrandId: item.autoBrandId,
            autoBrandName: !item.autoBrandId ? item.autoBrandName : null,
            autoModelId: item.autoModelId,
            autoModelName: !item.autoModelId ? item.autoModelName : null,
            article: item.article,
          },
          { transaction },
        );
      }
      for (const item of applicabilities?.updated || []) {
        const entity = await ProductApplicability.findByPk(item?.id);
        if (!entity) continue;
        await entity.update(
          {
            productId: product.id,
            autoTypeId: item.autoTypeId,
            autoBrandId: item.autoBrandId,
            autoBrandName: !item.autoBrandId ? item.autoBrandName : null,
            autoModelId: item.autoModelId,
            autoModelName: !item.autoModelId ? item.autoModelName : null,
            article: item.article,
          },
          { transaction },
        );
      }
      if (!!applicabilities?.deleted?.length) {
        await ProductApplicability.destroy({
          where: {
            id: applicabilities.deleted,
            productId: product.id,
          },
          transaction,
        });
      }
    }

    if (!!analogs) {
      for (const analogId of _.uniq(analogs?.added || [])) {
        await ProductAnalogs.create(
          {
            productId: product.id,
            analogId,
          },
          { transaction },
        );
        await ProductAnalogs.create(
          {
            productId: analogId,
            analogId: product.id,
          },
          { transaction },
        );
      }
      for (const analogId of _.uniq(analogs?.deleted || [])) {
        await ProductAnalogs.destroy({
          where: {
            productId: product.id,
            analogId,
          },
          force: true,
          transaction,
        });
        await ProductAnalogs.destroy({
          where: {
            productId: analogId,
            analogId: product.id,
          },
          force: true,
          transaction,
        });
      }
    }

    const applicability = await ProductApplicability.findOne({
      where: {
        productId: product.id,
      },
      order: [['createdAt', 'ASC']],
      attributes: ['productId'],
      transaction,
    });
    const hasApplicabilities = !!applicability;

    const analog = await ProductAnalogs.findOne({
      where: {
        productId: product.id,
      },
      order: [['createdAt', 'ASC']],
      attributes: ['productId'],
      transaction,
    });
    const hasAnalogs = !!analog;

    branchEntities = await ProductBranch.findAll({
      where: {
        productId: product.id,
        status: PUBLIC_PRODUCT_STATUSES,
      },
      transaction,
    });
    const branchCategoriesJson = JSON.stringify(getBranchesCategoriesJson(branchEntities));

    await product.update(
      {
        hasApplicabilities,
        hasAnalogs,
        branchCategoriesJson,
      },
      { transaction },
    );

    if (authUserRole.role.label === 'moderator') {
      allProductAutoTypeIds = _.uniq(allProductAutoTypeIds.filter(Boolean));
      allProductAutoBrandIds = _.uniq(allProductAutoBrandIds.filter(Boolean));
      const allAutoTypes = await AutoType.findAll({
        // where: { id: allProductAutoTypeIds },
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

    const productFiles = await ProductFile.findAll({
      where: {
        productId: product.id,
      },
      transaction,
    });
    product.productFiles = productFiles.map(el => el.toJSON() as ProductFile);
    await updateProductFiles({ product, files }, { transaction });

    return product;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении товара',
      error: err,
    });
  }
};

export async function updateProductFiles(
  props: {
    product: Product;
    files: Array<{ id: string }>;
  },
  { transaction }: { transaction: Transaction },
) {
  try {
    const { product, files } = props;

    if (!files) return;

    // Save product files (images)
    const productFiles: ProductFile[] = [];
    // Get new directory path
    const actualDirPath = getProductDirectoryPath(product.id, 'actual');
    // Create directory for product files if it doesn't exist
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

    // Get file entities
    const fileEntities = await FileModel.findAll({
      where: {
        id: files.map(el => el.id),
      },
      transaction,
    });

    // Iterate provided file list
    for (const fileEntity of fileEntities) {
      const isNewFile = !product.productFiles.find(el => el.fileId === fileEntity.id);
      if (!isNewFile) continue;

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

    // Iterate Product's file list
    for (const productFile of product.productFiles) {
      const isDeletedFile = !files?.find(el => el.id === productFile.fileId);
      if (!isDeletedFile) continue;

      // Drop files out of new file list
      await FileModel.destroy({
        where: {
          id: productFile.fileId,
        },
        transaction,
      });
      await ProductFile.destroy({
        where: {
          id: productFile.id,
        },
        transaction,
      });
      // if (fs.existsSync(`${UPLOAD_FILES_DIRECTORY}/${productFile.file.path}`)) {
      //   await fs.promises.unlink(`${UPLOAD_FILES_DIRECTORY}/${productFile.file.path}`);
      // }
    }
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении файлов товара',
    });
  }
}
