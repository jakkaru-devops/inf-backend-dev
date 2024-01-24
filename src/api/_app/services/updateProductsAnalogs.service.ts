import { Request, Response } from 'express';
import httpStatus from 'http-status';
import fs from 'fs';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import { PRODUCT_ANALOGS_FULL_FILE_PATH } from '../data';
import Product from '../../catalog/models/Product.model';
import formatDistance from 'date-fns/formatDistance';

interface IProductData {
  name: string;
  article: string;
  orderCode: string;
  analogs: Array<{
    name: string;
    price: number;
    orderCode: string;
    brand: string;
    article: string;
    additionalArticle: string;
  }>;
}

export const updateProductsAnalogsService = async (req: Request, res: Response) => {
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

    const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(PRODUCT_ANALOGS_FULL_FILE_PATH) as any);
    let i = PRODUCTS.length;
    let matchCount = 0;

    for (const productData of PRODUCTS) {
      i--;
      // console.log(`${i} products remaining`);

      if ((productData?.analogs || []).length > 12) {
        matchCount++;
        // console.log(`MATCH ${productData.article} ${productData.orderCode}`)
      }
      if (productData.article !== 'FG-1058') continue;

      console.log((productData?.analogs || []).map(el => el.article));
      console.log('LENGTH', (productData?.analogs || []).length);

      const productEntity = await Product.findOne({
        where: {
          article: productData.article,
          code: productData.orderCode,
        },
        attributes: ['id', 'article', 'code'],
      });
      if (!productEntity) {
        console.log(`Product ${productData.article} ${productData.orderCode} not found`);
        continue;
      }

      /* for (const analogData of (productData.analogs || [])) {
        const analogProductEntity = await Product.findOne({
          where: {
            article: analogData.article,
            code: analogData.orderCode,
          },
          attributes: ['id', 'article', 'code'],
        })
        if (!analogProductEntity) continue
        await ProductAnalogs.findOrCreate({
          where: {
            productId: productEntity.id,
            analogId: analogProductEntity.id,
          },
          defaults: {
            productId: productEntity.id,
            analogId: analogProductEntity.id,
          }
        })
        // const analogEntity = await ProductAnalogs.findOne({
        //   where: {
        //     productId: productEntity.id,
        //     analogId: analogProductEntity.id,
        //   }
        // })
        // if (!analogEntity) {
        //   await ProductAnalogs.create({
        //     productId: productEntity.id,
        //     analogId: analogProductEntity.id,
        //   })
        // }
        console.log(`Analog ${analogProductEntity.article} created for ${productEntity.article}`)
      } */
    }

    const endTime = new Date().getTime();

    console.log(`MATCH COUNT - ${matchCount}`);
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
