import seq, { Sequelize, Op } from 'sequelize';
import _ from 'lodash';
import Product from '../models/Product.model';
import ProductFile from '../models/ProductFile.model';
import { PUBLIC_PRODUCT_STATUSES } from '../data';
import FileModel from '../../files/models/File.model';
import { getProductPreviewUrl } from '../utils';
import { getPaginationParams, transformEntityLocale } from '../../../utils/common.utils';
import User from '../../user/models/User.model';
import { defineProductsSearchParams } from '../utils/defineProductsSearchParams.util';

export interface IGetProductListProps {
  userId?: User['id'];
  search?: string;
  exactSearch?: boolean;
  exactSearchBy?: 'article';
  searchFields?: Array<'name' | 'description' | 'article'>;
  orderBy?: 'price' | 'date' | 'name';
  orderDirection?: 'asc' | 'ASC' | 'desc' | 'DESC';
  includeHidden?: boolean;
  productIds?: string[];
  excludeIds?: string[];
  autoType?: string | string[];
  autoBrand?: string | string[];
  autoModel?: string | string[];
  group?: string | string[];
  subgroup?: string | string[];
  include?: Array<'files'>;
  status?: number | number[];
  pagination?: {
    page?: number;
    pageSize?: number;
    offset?: number;
    limit?: number;
  };
  organizationRegion?: string | string[];
  minSaleQuantity?: number;
}

export const getProductListService = async ({
  userId,
  search,
  exactSearch,
  exactSearchBy,
  searchFields = ['name', 'description', 'article'],
  orderBy = 'price',
  orderDirection = 'desc',
  includeHidden,
  productIds,
  excludeIds,
  autoType,
  autoBrand,
  autoModel,
  group,
  subgroup,
  include,
  status,
  pagination,
}: IGetProductListProps) => {
  const options: seq.FindAndCountOptions = {
    ...getPaginationParams(pagination, 36),
    distinct: true,
    include: [],
  };

  orderDirection = orderDirection.toUpperCase() as 'ASC' | 'DESC';

  if (!orderBy || orderBy === 'date')
    options.order = [
      [Sequelize.literal('CASE WHEN "previewFileId" IS NOT NULL THEN 0 ELSE 1 END'), 'ASC NULLS LAST'],
      ['createdAt', orderDirection],
    ];
  else if (orderBy === 'name')
    options.order = [
      [Sequelize.literal('CASE WHEN "previewFileId" IS NOT NULL THEN 0 ELSE 1 END'), 'ASC NULLS LAST'],
      ['name_ru', orderDirection],
    ];
  else if (orderBy === 'price')
    options.order = [
      [
        Sequelize.literal('CASE WHEN "previewFileId" IS NOT NULL AND "minPrice" IS NOT NULL THEN 0 ELSE 1 END'),
        'ASC NULLS LAST',
      ],
      ['minPrice', `${orderDirection} NULLS LAST`],
      ['name_ru', 'ASC'],
    ];

  const and = [];

  // Main filters
  and.push({ mainProductId: null });
  if (!!status) and.push({ status });
  else if (!includeHidden) and.push({ status: PUBLIC_PRODUCT_STATUSES });

  // Additional filters
  if (!!userId) and.push({ userId });
  if (!!productIds?.length) and.push({ id: { [Op.in]: productIds } });
  if (!!excludeIds?.length) and.push({ id: { [Op.notIn]: excludeIds } });

  // Handle search
  if (!!search.length) {
    and.push([defineProductsSearchParams({ search, exactSearch, exactSearchBy, searchFields })]);
  }

  // Handle includes
  if (include?.includes('files')) {
    options.include.push({
      model: ProductFile,
      as: 'productFiles',
      separate: true,
      required: false,
      include: [{ model: FileModel, as: 'file' }],
    });
  }

  // Handle categories
  const whereBranchJson = [autoType, autoBrand, autoModel, group, subgroup].flat().filter(Boolean);
  if (!!whereBranchJson?.length) {
    and.push({
      branchCategoriesJson: {
        [Op.substring]: JSON.stringify(whereBranchJson).replace('[', '').replace(']', ''),
      },
    });
  }

  options.where = { [Op.and]: and };

  // Fetch products
  let products = await Product.findAndCountAll(options);

  products.rows = products.rows.map(product => ({
    ...transformEntityLocale(product),
    name: product?.pureName || product?.name_ru,
    preview: getProductPreviewUrl(product),
    length: product.length || null,
    width: product.width || null,
    height: product.height || null,
  })) as Product[];

  return products;
};
