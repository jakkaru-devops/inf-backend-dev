import { FindAndCountOptions, FindOptions } from 'sequelize';
import User from '../../user/models/User.model';
import Product from '../models/Product.model';
import { Sale } from '../models/Sale.model';
import Organization from '../../organization/models/Organization.model';
import Address from '../../address/models/Address.model';
import StockBalance from '../models/StockBalance.model';
import { Op } from 'sequelize';
import { defineProductsSearchParams } from '../utils/defineProductsSearchParams.util';
import { getPaginationParams, transformEntityLocale } from '../../../utils/common.utils';
import { getProductPreviewUrl } from '../utils';
import { IPaginationParams } from '../../../interfaces/common.interfaces';
import ProductFile from '../models/ProductFile.model';
import FileModel from '../../files/models/File.model';

interface IProps {
  sellerId?: User['id'];
  orderBy?: 'price' | 'date' | 'name';
  search?: string;
  exactSearch?: boolean;
  exactSearchBy?: 'article';
  searchFields?: Array<'name' | 'description' | 'article'>;
  region?: string;
  autoType?: string | string[];
  autoBrand?: string | string[];
  autoModel?: string | string[];
  group?: string | string[];
  subgroup?: string | string[];
  pagination?: IPaginationParams;
}

export const getSaleProductListService = async ({
  sellerId,
  orderBy,
  search,
  exactSearch,
  exactSearchBy,
  searchFields,
  region,
  autoType,
  autoBrand,
  autoModel,
  group,
  subgroup,
  pagination,
}: IProps) => {
  const options: FindAndCountOptions = {
    ...getPaginationParams(pagination, 36),
    distinct: true,
    where: {},
  };
  const productOptions: FindOptions = {
    where: {},
    include: [
      {
        model: ProductFile,
        as: 'productFiles',
        separate: true,
        required: false,
        limit: 1,
        include: [{ model: FileModel, as: 'file' }],
      },
    ],
  };
  const andProducts = [];

  // Define order
  if (!orderBy || orderBy === 'date') options.order = [[{ model: Product, as: 'product' }, 'createdAt', 'DESC']];
  else if (orderBy === 'name') options.order = [[{ model: Product, as: 'product' }, 'name_ru', 'ASC']];
  else if (orderBy === 'price') options.order = [[{ model: StockBalance, as: 'priceOffer' }, 'price', 'ASC']];

  // Filter by seller
  if (!!sellerId) options.where['userId'] = sellerId;

  // Filter by region
  if (!!region) options.where['regionId'] = region;

  // Handle search
  if (!!search?.length) {
    andProducts.push([...defineProductsSearchParams({ search, exactSearch, exactSearchBy, searchFields })]);
  }

  // Handle categories
  const whereBranchJson = [autoType, autoBrand, autoModel, group, subgroup].flat().filter(Boolean);
  if (!!whereBranchJson?.length) {
    andProducts.push({
      branchCategoriesJson: {
        [Op.substring]: JSON.stringify(whereBranchJson).replace('[', '').replace(']', ''),
      },
    });
  }

  productOptions.where[Op.and] = andProducts;

  const sales = await Sale.findAndCountAll({
    ...options,
    include: [
      { model: Product, as: 'product', required: true, ...productOptions },
      { model: StockBalance, as: 'priceOffer', required: true },
      { model: Organization, as: 'organization', required: true },
      { model: Address, as: 'supplierAddress', required: true },
    ],
  });

  return {
    count: sales.count,
    rows: sales.rows.map(
      sale =>
        ({
          ...transformEntityLocale(sale.product),
          name: sale.product?.pureName || sale.product?.name_ru,
          preview: getProductPreviewUrl(sale.product),
          sale: {
            ...transformEntityLocale(sale),
            price: sale.priceOffer.price,
            previousPrice: sale.priceOffer.previousPrice,
            amount: sale.priceOffer.amount,
          },
        } as Product),
    ),
  };
};
