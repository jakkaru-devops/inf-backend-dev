import Product from '../models/Product.model';
import {
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  PRODUCTS_UPLOAD_SECTION,
  EXTERNAL_APP_URL,
} from '../../../config/env';
import { IDescribedProduct, IProduct } from '../interfaces';
import DescribedProduct from '../models/DescribedProduct.model';
import FileModel from '../../files/models/File.model';
import formatDate from 'date-fns/format';
import { transformEntityLocale } from '../../../utils/common.utils';
import DescribedProductAutoBrands from '../models/DescribedProductAutoBrands.model';
import ProductGroup from '../models/ProductGroup.model';
import ProductBranch from '../models/ProductBranch.model';

/**
 * @desc Get product preview url
 * @param product Product
 * @param req Request
 * @returns string | null
 */
export const getProductPreviewUrl = (product: Product | DescribedProduct) => {
  if ((product.productFiles || []).length === 0) return null;

  let result = '';

  const fileIndex = product.productFiles.findIndex(el => el.fileId === product['previewFileId']);

  if (fileIndex === -1) {
    result = product.productFiles[0].file.path;
  } else {
    result = product.productFiles[fileIndex].file.path;
  }
  result = `${EXTERNAL_APP_URL}/files/${result}`;

  return result;
};

/**
 * @desc Get files preview url
 * @param file FileModel
 * @param req Request
 * @returns string | null
 */
export const getFilePreviewUrl = (file: FileModel) => (file?.path ? `${EXTERNAL_APP_URL}/files/${file.path}` : null);

/**
 * @desc Transform product to send to frontend
 * @param product Product
 * @param req Request
 * @returns IProduct
 */
export const transformProduct = (product: Product): IProduct => {
  if (!product) return null;

  // Transform product entity to plain object
  if (!!product.get) {
    product = product.toJSON() as Product;
  }

  // Return result
  return {
    ...product,
    name: product.name_ru,
    description: product?.description_ru || null,
    preview: getProductPreviewUrl(product),
  } as IProduct;
};

/**
 * @desc Transform described product to send to frontend
 * @param product DescribedProduct
 * @param req Request
 * @returns IDescribedProduct
 */
export const transformDescribedProduct = ({
  product,
  productGroups,
}: {
  product: DescribedProduct;
  productGroups?: ProductGroup[];
}): IDescribedProduct => {
  // Transform product entity to plain object
  if (!!product.get) {
    product = product.toJSON() as DescribedProduct;
  }

  if (!!product.autoBrand) product.autoBrand = transformEntityLocale(product.autoBrand);
  if (!!product.autoBrandsData)
    product.autoBrandsData = product.autoBrandsData.map(
      item =>
        ({
          ...item,
          autoType: transformEntityLocale(item.autoType),
          autoBrand: transformEntityLocale(item.autoBrand),
        } as DescribedProductAutoBrands),
    );
  if (!!product.productGroup) {
    product.productGroup = transformEntityLocale(product.productGroup);
  }
  if (!!product?.productGroupIds && !!productGroups?.length) {
    (product as any).productGroups = product?.productGroupIds.map(itemId =>
      transformEntityLocale(productGroups?.find(el => el.id === itemId)),
    );
  }

  // Return result
  return {
    ...product,
    preview: getProductPreviewUrl(product),
    attachments: product.productFiles.map(({ file }) => ({
      name: file.name,
      ext: file.ext,
      url: getFilePreviewUrl(file),
    })),
  } as IDescribedProduct;
};

export const getProductDirectoryPath = (productId: string, type: 'actual' | 'db') =>
  (type === 'actual' ? UPLOAD_FILES_DIRECTORY : ``) +
  `/${PRODUCTS_UPLOAD_SECTION}/${productId}/${formatDate(new Date(), UPLOADS_DATE_FORMAT)}`;

export const simplifyProductArticle = (article: string) =>
  article
    .trim()
    .replace(/[^a-zA-Zа-яА-Я0-9]/g, '')
    .toLowerCase();

export const simplifyProductName = (name: string, article: string) => {
  return simplifyStr(name.trim() + ' ' + article.trim());
};

export const simplifyStr = (str: string) =>
  str
    .trim()
    .replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '')
    .toLowerCase();

export const getAutoTypeName = (name: string) => {
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

export const getBranchesCategoriesJson = (branches: ProductBranch[]) => {
  const result: string[][][] = [];
  for (const branch of branches) {
    const item: string[][] = [];
    item[0] = [branch?.autoTypeId, branch?.autoBrandId, branch?.groupId, branch?.subgroupId].filter(Boolean);
    item[1] = [branch?.autoTypeId, branch?.autoBrandId].filter(Boolean);
    item[2] = [branch?.autoTypeId, branch?.groupId, branch?.subgroupId].filter(Boolean);
    item[3] = [branch?.autoBrandId, branch?.groupId, branch?.subgroupId].filter(Boolean);
    result.push(item.filter(el => !!el?.length));
  }
  return result.filter(el => !!el?.length);
};
