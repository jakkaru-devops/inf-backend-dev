import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import Language from '../../language/models/Language.model';
import Product from '../../catalog/models/Product.model';
import { PRODUCT_STATUSES } from '../../catalog/data';
import { INITIAL_PRODUCT_LIST } from '../data/products';
import fs from 'fs';
import path from 'path';
import appRoot from 'app-root-path';
import FileModel from '../../files/models/File.model';
import { generateRandomCode } from '../../../utils/common.utils';
import {
  UNKNOWN_UPLOAD_SECTION,
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  USERS_UPLOAD_SECTION,
} from '../../../config/env';
import formatDate from 'date-fns/format';
import { createDir } from '../../files/utils';
import { createProductAnalogService } from '../../catalog/services/createProductAnalog.service';
import ProductAnalogs from '../../catalog/models/ProductAnalogs.model';
import { APIError } from '../../../utils/api.utils';
import catalogService from '../../catalog/catalog.service';

type IProps = {
  defaultLanguage: Language;
  res: Response;
  transaction: Transaction;
};

export interface IResult {
  products: Product[];
  productAnalogs: ProductAnalogs[];
}

export const createInitialProductsService = async ({ res, transaction }: IProps): Promise<IResult> => {
  try {
    const products: Product[] = [];
    const productAnalogs: ProductAnalogs[] = [];

    for (const productData of INITIAL_PRODUCT_LIST) {
      const files = [];

      if (!productData.noImage) {
        // Get array of specific product's file names from _init folder
        const fileNames = fs.readdirSync(path.join(appRoot + `/_init/products/${productData.id}`));
        // Handle each file name
        for (const fileName of fileNames) {
          const fileInitPath = path.join(appRoot + `/_init/products/${productData.id}/${fileName}`);
          // Get static file
          const stat = fs.statSync(fileInitPath);
          // Define file's data
          const file = {
            name: fileName,
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

          const newFile = await FileModel.create(
            {
              // userId: authUser.id,
              name: file.name,
              ext,
              size: file.size,
              path: fileDBPath,
            },
            { transaction },
          );
          files.push({
            id: newFile.id,
          });

          if (!fs.existsSync(directoryPath)) {
            const newDir = await createDir(directoryPath);
            if (!newDir) {
              throw APIError({
                res,
                status: httpStatus.INTERNAL_SERVER_ERROR,
                message: 'An error has occured while creating initial products',
                strict: true,
              });
            }
          }
          fs.copyFile(fileInitPath, `${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`, err => {
            if (err) {
              return {
                error: {
                  status: err.code,
                  message: err.message,
                  error: err,
                },
              };
            }
          });
        }
      }

      // Create product
      const product = await catalogService.createProduct(
        {
          status: PRODUCT_STATUSES.DEFAULT,
          article: productData.article,
          manufacturer: productData.manufacturer,
          weight: productData.weight,
          length: productData.length,
          width: productData.width,
          height: productData.height,
          previewFileId: '',
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
          files,
          authUserRole: null,
        },
        { transaction },
      );
      products.push(product);
    }

    const analogArticlesArray = [
      ['3909-1602054', '3909-1602055'],
      ['3909-1602055', '3909-1602056'],
      ['3909-1602054', '3909-1602056'],
    ];

    for (const analog of analogArticlesArray) {
      const product1 = products.find(item => item.article === analog[0]);
      const product2 = products.find(item => item.article === analog[1]);
      const { result } = await createProductAnalogService({
        productId: product1.id,
        analogId: product2.id,
        transaction,
      });
      productAnalogs.push(...result.productAnalogs);
    }

    return {
      products,
      productAnalogs,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating initial products',
      strict: true,
    });
  }
};
