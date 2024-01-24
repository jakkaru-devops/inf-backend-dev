import { Request, Response } from 'express';
import httpStatus from 'http-status';
import fs from 'fs';
import {
  ADMIN_ACCESS_KEY,
  UNKNOWN_UPLOAD_SECTION,
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  USERS_UPLOAD_SECTION,
} from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import seq, { Op, Sequelize } from 'sequelize';
import { PRODUCT_CATEGORY_STATUSES, PRODUCT_STATUSES } from '../../catalog/data';
import { OUTER_PRODUCTS_JSON_PATH } from '../data';
import AutoType from '../../catalog/models/AutoType.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import { generateLabel, generateRandomCode } from '../../../utils/common.utils';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import Product from '../../catalog/models/Product.model';
import AutoTypeGroupRelations from '../../catalog/models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../../catalog/models/relations/AutoBrandGroupRelations.model';
import formatDistance from 'date-fns/formatDistance';
import ProductAutoTypeRelations from '../../catalog/models/relations/ProductAutoTypeRelations.model';
import ProductAutoBrandRelations from '../../catalog/models/relations/ProductAutoBrandRelations.model';
import ProductGroupRelations from '../../catalog/models/relations/ProductGroupRelations.model';
import { getProductDirectoryPath, simplifyProductArticle } from '../../catalog/utils';
import CatalogSection from '../../catalog/models/CatalogSection.model';
import AutoTypeBrandRelations from '../../catalog/models/relations/AutoTypeBrandRelations.model';
import path from 'path';
import appRoot from 'app-root-path';
import formatDate from 'date-fns/format';
import FileModel from '../../files/models/File.model';
import { createDir } from '../../files/utils';
import ProductFile from '../../catalog/models/ProductFile.model';
import catalogService from '../../catalog/catalog.service';

interface IProductData {
  id: string;
  name: string;
  article: string;
  description: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  autoTypes: string[];
  autoBrands: string[];
  autoModels: string[];
  group: string;
  subgroup: string;
  groupsCatalog: ProductGroup['catalog'];
  photoFolderPath?: string;
}

const getAutoTypeName = (name: string) => {
  switch (name.toLowerCase()) {
    case 'отечественные грузовики':
    case 'европейские грузовики':
    case 'корейские грузовики':
    case 'грузовики':
      return 'Грузовые';
    case 'легковые автомобили':
      return 'Легковые';
    case 'тракторы и спецтехника':
      return 'Спецтехника';
    case 'автобусы':
      return 'Автобусы';
    case 'коммерческий транспорт':
      return 'Коммерческий';
    case 'полуприцепы и оси':
    case 'прицепы и полуприцепы':
      return 'Прицепы';
    default:
      return name;
  }
};

export const transferPhotoProductsService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    // Exceptions
    const exceptionBrand = {
      old: 'Mercedes',
      new: 'Mercedes-Benz',
    };
    await AutoBrand.update(
      {
        label: generateLabel(exceptionBrand.new),
        name_ru: exceptionBrand.new,
      },
      {
        where: {
          name_ru: exceptionBrand.old,
        },
      },
    );

    const startTime = new Date().getTime();

    const catalogSection = await CatalogSection.findOne();

    const OUTER_PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(OUTER_PRODUCTS_JSON_PATH) as any);

    let i = OUTER_PRODUCTS.length;
    for (const productData of OUTER_PRODUCTS) {
      i--;
      console.info(`${i} photo products remain`);

      // if (i > 1263) continue;

      console.log(productData);
      if (!productData) continue;
      productData.article = productData.article.toString().trim();
      if (productData.description) productData.description = productData.description.toString().trim();
      if (productData.group) productData.group = productData.group.toString().trim();
      if (productData.subgroup) productData.subgroup = productData.subgroup.toString().trim();
      productData.autoTypes = (productData.autoTypes || []).filter(Boolean).map(el => el.toString().trim());
      productData.autoBrands = (productData.autoBrands || []).filter(Boolean).map(el => el.toString().trim());
      productData.autoModels = (productData.autoModels || []).filter(Boolean).map(el => el.toString().trim());

      if (productData.article === 'Характеристики') continue;

      const autoTypeEntities = await Promise.all(
        (productData.autoTypes || []).map(
          async autoTypeName =>
            await AutoType.findOne({
              where: {
                name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
                  [Op.eq]: getAutoTypeName(autoTypeName).toLowerCase(),
                } as seq.LogicType),
              },
            }),
        ),
      );
      const autoBrandEntities: AutoBrand[] = [];
      for (const autoBrandName of productData.autoBrands || []) {
        const [autoBrandEntity] = await AutoBrand.findOrCreate({
          where: {
            label: generateLabel(autoBrandName),
          },
          defaults: {
            label: generateLabel(autoBrandName),
            name_ru: autoBrandName,
            catalogSectionId: catalogSection.id,
          },
        });
        autoBrandEntities.push(autoBrandEntity);
      }

      const groupEntity = !!productData?.group
        ? (
            await ProductGroup.findOrCreate({
              where: {
                name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
                  [Op.eq]: productData?.group.toLowerCase(),
                } as seq.LogicType),
                parentId: null,
                nestingLevel: 0,
                catalog: productData.groupsCatalog,
              },
              defaults: {
                status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
                label: generateLabel(productData?.group),
                name_ru: productData?.group,
                parentId: null,
                nestingLevel: 0,
                catalogSectionId: catalogSection.id,
                catalog: productData.groupsCatalog,
              },
            })
          )[0]
        : null;
      const subgroupEntity =
        !!productData?.subgroup && !!groupEntity
          ? (
              await ProductGroup.findOrCreate({
                where: {
                  name_ru: Sequelize.where(Sequelize.fn('lower', Sequelize.col('name_ru')), {
                    [Op.eq]: productData?.subgroup.toLowerCase(),
                  } as seq.LogicType),
                  parentId: {
                    [Op.ne]: null,
                  },
                  nestingLevel: 1,
                  catalog: productData.groupsCatalog,
                },
                defaults: {
                  status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
                  label: generateLabel(productData?.subgroup),
                  name_ru: productData?.subgroup,
                  parentId: groupEntity.id,
                  nestingLevel: 1,
                  catalogSectionId: catalogSection.id,
                  catalog: productData.groupsCatalog,
                },
              })
            )[0]
          : null;

      for (const autoTypeEntity of autoTypeEntities) {
        for (const autoBrandEntity of autoBrandEntities) {
          await AutoTypeBrandRelations.findOrCreate({
            where: {
              autoTypeId: autoTypeEntity.id,
              autoBrandId: autoBrandEntity.id,
            },
            defaults: {
              autoTypeId: autoTypeEntity.id,
              autoBrandId: autoBrandEntity.id,
            },
          });
        }
        if (!!groupEntity) {
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
        }
        if (!!subgroupEntity) {
          await AutoTypeGroupRelations.findOrCreate({
            where: {
              autoTypeId: autoTypeEntity.id,
              productGroupId: subgroupEntity.id,
            },
            defaults: {
              autoTypeId: autoTypeEntity.id,
              productGroupId: subgroupEntity.id,
            },
          });
        }
      }
      for (const autoBrandEntity of autoBrandEntities) {
        if (!!groupEntity) {
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
        if (!!subgroupEntity) {
          await AutoBrandGroupRelations.findOrCreate({
            where: {
              autoBrandId: autoBrandEntity.id,
              productGroupId: subgroupEntity.id,
            },
            defaults: {
              autoBrandId: autoBrandEntity.id,
              productGroupId: subgroupEntity.id,
            },
          });
        }
      }

      const articleSimplified = simplifyProductArticle(productData.article);
      const whereProduct: any = {
        articleSimplified,
      };
      if (!!productData?.autoBrands?.length) {
        const productNameOr = productData?.autoBrands.map(brandName => ({
          [Op.iLike]: `%${brandName}%`,
        }));
        whereProduct.name_ru = {
          [Op.or]: productNameOr,
        };
      }
      const productEntity = await Product.findOne({
        where: whereProduct,
      });

      if (!!productEntity) {
        const updateData: any = {
          // description_ru: productData?.description.split('\\n').join('<br>'),
          description_ru: productData?.description,
          isExternalProduct: true,
        };
        if (!productEntity?.width) updateData.width = productData?.width;
        if (!productEntity?.height) updateData.height = productData?.height;
        if (!productEntity?.length) updateData.length = productData?.length;
        if (!productEntity?.weight) updateData.weight = productData?.weight;

        console.log(updateData);

        for (const autoTypeEntity of autoTypeEntities) {
          await ProductAutoTypeRelations.findOrCreate({
            where: {
              productId: productEntity.id,
              autoTypeId: autoTypeEntity.id,
            },
            defaults: {
              productId: productEntity.id,
              autoTypeId: autoTypeEntity.id,
            },
          });
        }
        for (const autoBrandEntity of autoBrandEntities) {
          await ProductAutoBrandRelations.findOrCreate({
            where: {
              productId: productEntity.id,
              autoBrandId: autoBrandEntity.id,
            },
            defaults: {
              productId: productEntity.id,
              autoBrandId: autoBrandEntity.id,
            },
          });
        }
        if (!!groupEntity) {
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
        if (!!subgroupEntity) {
          await ProductGroupRelations.findOrCreate({
            where: {
              productId: productEntity.id,
              productGroupId: subgroupEntity.id,
            },
            defaults: {
              productId: productEntity.id,
              productGroupId: subgroupEntity.id,
            },
          });
        }

        const files: { id: string }[] = [];

        if (!!productData?.photoFolderPath) {
          const a = fs.readdirSync(path.join(appRoot + '/_init/catalog/images/gallery', productData?.photoFolderPath), {
            withFileTypes: true,
          });
          const fileItems = a
            .filter(item => item.isFile())
            .map(item => ({
              path: path.join(appRoot + '/_init/catalog/images/gallery', productData?.photoFolderPath, item.name),
              name: item.name,
            }));

          for (const fileItem of fileItems) {
            // Get static file
            const stat = fs.statSync(fileItem.path);
            // Define file's data
            const file = {
              name: fileItem.name,
              size: stat.size,
            };
            const newFileName = `${generateRandomCode({
              length: 20,
              symbols: false,
              uppercase: false,
              excludeSimilarCharacters: false,
            })}-${file.name}`;
            const fileDBPath = `${getProductDirectoryPath(productEntity.id, 'db')}/${newFileName}`;
            const directoryPath = getProductDirectoryPath(productEntity.id, 'actual');
            const ext = file.name.split('.').pop();

            const fileEntity = await FileModel.create({
              name: file.name,
              ext,
              size: file.size,
              path: fileDBPath,
            });
            if (!fs.existsSync(directoryPath)) {
              const newDir = await createDir(directoryPath);
              if (!newDir) {
                throw APIError({
                  res,
                  status: httpStatus.INTERNAL_SERVER_ERROR,
                  message: 'An error has occured while copying outer product files',
                });
              }
            }
            console.log('--------');
            console.log(productData.article);
            console.log(fileItem.path);
            console.log(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);
            console.log('--------');
            fs.copyFileSync(fileItem.path, `${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);

            // Create product file
            await ProductFile.create({
              productId: productEntity.id,
              fileId: fileEntity.id,
            });

            files.push({
              id: fileEntity.id,
            });
          }
        }

        if (!productEntity?.previewFileId) updateData.previewFileId = files?.[0]?.id;
        await productEntity.update(updateData);
      } else {
        const files: { id: string }[] = [];

        if (productData?.photoFolderPath) {
          const a = fs.readdirSync(path.join(appRoot + '/_init/catalog/images/gallery', productData?.photoFolderPath), {
            withFileTypes: true,
          });
          const fileItems = a
            .filter(item => item.isFile())
            .map(item => ({
              path: path.join(appRoot + '/_init/catalog/images/gallery', productData?.photoFolderPath, item.name),
              name: item.name,
            }));

          for (const fileItem of fileItems) {
            // Get static file
            const stat = fs.statSync(fileItem.path);
            // Define file's data
            const file = {
              name: fileItem.name,
              size: stat.size,
            };
            const nowDate = formatDate(new Date(), UPLOADS_DATE_FORMAT);
            const newFileName = `${generateRandomCode({
              length: 20,
              symbols: false,
              uppercase: false,
              excludeSimilarCharacters: false,
            })}-${file.name}`;
            const fileDBPath = `${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest/${newFileName}`;
            const directoryPath = `${UPLOAD_FILES_DIRECTORY}/${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest`;
            const ext = file.name.split('.').pop();

            const fileEntity = await FileModel.create({
              name: file.name,
              ext,
              size: file.size,
              path: fileDBPath,
            });
            files.push({ id: fileEntity.id });
            if (!fs.existsSync(directoryPath)) {
              const newDir = await createDir(directoryPath);
              if (!newDir) {
                throw APIError({
                  res,
                  status: httpStatus.INTERNAL_SERVER_ERROR,
                  message: 'An error has occured while copying outer product files',
                });
              }
            }
            console.log('--------');
            console.log(productData.article);
            console.log(fileItem.path);
            console.log(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);
            console.log('--------');
            fs.copyFileSync(fileItem.path, `${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);
          }
        }

        await catalogService.createProduct(
          {
            status: PRODUCT_STATUSES.DEFAULT,
            article: productData.article,
            width: productData?.width,
            height: productData?.height,
            length: productData?.length,
            weight: productData?.weight,
            files,
            previewFileId: files?.[0]?.id,
            name: productData.name,
            description: productData?.description,
            isExternalProduct: true,
            branches: [], // TODO
            authUserRole: null,
          },
          { transaction: null },
        );
      }
    }

    const endTime = new Date().getTime();

    console.log(`Photo products transfer took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'The photo products transfered successfully',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while transfer photo products',
      error: err,
    });
  }
};
