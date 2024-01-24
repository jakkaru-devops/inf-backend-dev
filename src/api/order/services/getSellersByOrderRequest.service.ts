import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import { IRequestProduct } from '../interfaces';
import seq, { Op } from 'sequelize';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import Address from '../../address/models/Address.model';
import { Transaction } from 'sequelize';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import { PUBLIC_PRODUCT_CATEGORY_STATUSES, PUBLIC_PRODUCT_STATUSES } from '../../catalog/data';
import _ from 'lodash';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  selectedSellerIds: string[];
  settlements: any;
  requestProducts: IRequestProduct[];
  authUser: User;
  transaction: Transaction;
}

export const getSellersByOrderRequestService = async ({
  selectedSellerIds,
  settlements,
  requestProducts,
  authUser,
  transaction,
}: IProps): Promise<User[]> => {
  try {
    const options: seq.FindAndCountOptions = {
      transaction,
      distinct: true,
      subQuery: false,
    };
    options.where = {
      [Op.and]: [],
    };
    options.include = [];

    options.where[Op.and].push(
      {
        sellerConfirmationDate: {
          [Op.ne]: null,
        },
      },
      {
        id: {
          [Op.ne]: authUser.id,
        },
      },
    );

    if (!!selectedSellerIds?.length) {
      options.where[Op.and].push({
        id: {
          [Op.in]: selectedSellerIds,
        },
      });
    }

    if (!!settlements?.length) {
      const fiasIds: string[] = settlements
        .filter(item => !!item.fias_id || !!item.aoguid)
        .map(item => item.fias_id || item.aoguid);
      options.include.push({
        model: OrganizationSeller,
        as: 'sellers',
        required: true,
        include: [
          {
            model: OrganizationBranch,
            as: 'branch',
            required: true,
            include: [
              {
                model: Address,
                as: 'actualAddress',
                required: true,
                where: {
                  [Op.or]: [
                    { regionFiasId: { [Op.in]: fiasIds } },
                    { areaFiasId: { [Op.in]: fiasIds } },
                    { cityFiasId: { [Op.in]: fiasIds } },
                    { settlementFiasId: { [Op.in]: fiasIds } },
                  ],
                },
              },
            ],
          },
        ],
      });
    }

    // ===================================
    let sellers: User[] = [];
    const productIds = requestProducts.filter(item => !!item.productId).map(item => item.productId);
    if (!!productIds.length) {
      const sideProductGroups = await ProductGroup.findAll({
        where: {
          status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
          isHidden: false,
          nestingLevel: 0,
          parentId: null,
          catalog: ['AUTO_PRODUCTS', 'AUTO_TOOLS'],
        },
        transaction,
      });
      const sideProductGroupIds = sideProductGroups.map(el => el.id);
      const sellerAutoBrandsOptions: Array<{ autoTypeId?: string; autoBrandId?: string }> = [];
      const sellerProductGroupsOptions: string[] = [];

      const productBranches = await ProductBranch.findAll({
        where: {
          productId: productIds,
          status: PUBLIC_PRODUCT_STATUSES,
        },
        transaction,
      });

      for (const branch of productBranches) {
        if (!!branch?.autoTypeId || !!branch?.autoBrandId) {
          sellerAutoBrandsOptions.push({ autoTypeId: branch?.autoTypeId, autoBrandId: branch?.autoBrandId });
        }
        if (!!branch?.groupId && sideProductGroupIds.includes(branch?.groupId)) {
          sellerProductGroupsOptions.push(branch?.groupId);
        }
      }

      let sellersByAutoBrands: User[] = [];
      let sellersByGroups: User[] = [];

      if (!!sellerAutoBrandsOptions?.length) {
        sellersByAutoBrands = await User.findAll({
          ...options,
          include: [
            ...options.include,
            {
              model: SellerAutoBrands,
              as: 'sellerAutoBrands',
              required: true,
              where: {
                [Op.or]: sellerAutoBrandsOptions,
              },
            },
          ],
        });
      }
      if (!!sellerProductGroupsOptions?.length) {
        if (!!sellersByAutoBrands?.length) {
          // exclude already found sellers
          options.where[Op.and].push({
            id: {
              [Op.notIn]: sellers.map(el => el.id),
            },
          });
        }
        sellersByGroups = await User.findAll({
          ...options,
          include: [
            ...options.include,
            {
              model: ProductGroup,
              as: 'sellerProductGroups',
              required: true,
              where: {
                id: {
                  [Op.in]: sellerProductGroupsOptions.map(id => id),
                },
              },
            },
          ],
        });
      }

      sellers = _.uniqBy([...sellersByAutoBrands, ...sellersByGroups], 'id');
    }

    if (!sellers?.length) {
      const describedProductsAutoBrands = requestProducts
        .filter(item => !!item.describedProductData)
        .flatMap(item => item.describedProductData.autoBrands)
        .filter(Boolean);
      const describedProductGroupIds = requestProducts
        .filter(item => !!item.describedProductData)
        .flatMap(item => item.describedProductData.productGroupIds)
        .filter(Boolean);

      let sellersByAutoBrands: User[] = [];
      let sellersByGroups: User[] = [];

      if (!!describedProductsAutoBrands?.length) {
        sellersByAutoBrands = await User.findAll({
          ...options,
          include: [
            ...(options?.include || []),
            {
              model: SellerAutoBrands,
              as: 'sellerAutoBrands',
              required: true,
              where: {
                [Op.or]: describedProductsAutoBrands.map(item => ({
                  autoTypeId: item.autoTypeId,
                  autoBrandId: item.autoBrandId,
                })),
              },
            },
          ],
        });
      }
      if (!!describedProductGroupIds?.length) {
        sellersByGroups = await User.findAll({
          ...options,
          include: [
            ...(options?.include || []),
            {
              model: ProductGroup,
              as: 'sellerProductGroups',
              required: true,
              where: {
                id: {
                  [Op.in]: describedProductGroupIds,
                },
              },
            },
          ],
        });
      }

      sellers = _.uniqBy([...sellersByAutoBrands, ...sellersByGroups], 'id');
    }
    // ===================================

    return sellers;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при получении списка продавцов для запроса',
      error: err,
    });
  }
};
