import httpStatus from 'http-status';
import _ from 'lodash';
import { Op } from 'sequelize';
import { Transaction } from 'sequelize';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import Product from '../../catalog/models/Product.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import OrderRequestSellerData from '../../order/models/OrderRequestSellerData.model';
import User from '../models/User.model';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  userId: User['id'];
  autoBrands: Array<{
    autoTypeId: string;
    autoBrandId: string;
  }>;
  productGroupIds: string[];
  transaction: Transaction;
}

export const updateSellerProductCategoriesService = async ({
  userId,
  autoBrands,
  productGroupIds,
  transaction,
}: IProps): Promise<void> => {
  try {
    const sellerAutoBrandsJson = !!autoBrands?.length
      ? JSON.stringify(
          autoBrands.map(item => ({
            autoTypeId: item.autoTypeId,
            autoBrandId: item.autoBrandId,
          })),
        )
      : null;
    const sellerProductGroupsJson = !!productGroupIds?.length
      ? JSON.stringify(productGroupIds.map(itemId => itemId))
      : null;

    await User.update(
      {
        sellerAutoBrandsJson,
        sellerProductGroupsJson,
      },
      {
        where: {
          id: userId,
        },
        transaction,
      },
    );

    const sellerAutoBrandsEntities = await SellerAutoBrands.findAll({
      where: {
        userId,
      },
      transaction,
    });

    for (const { autoTypeId, autoBrandId } of autoBrands) {
      if (
        !!sellerAutoBrandsEntities.find(
          entity => entity.autoTypeId === autoTypeId && entity.autoBrandId === autoBrandId,
        )
      )
        continue;
      await SellerAutoBrands.create(
        {
          userId,
          autoTypeId,
          autoBrandId,
        },
        {
          transaction,
        },
      );
    }

    for (const entity of sellerAutoBrandsEntities) {
      if (!!autoBrands.find(item => item.autoTypeId === entity.autoTypeId && item.autoBrandId === entity.autoBrandId))
        continue;
      await entity.destroy({
        force: true,
        transaction,
      });
    }

    const sellerProductGroupsEntities = await SellerProductGroups.findAll({
      where: {
        userId,
      },
      transaction,
    });

    for (const productGroupId of productGroupIds) {
      if (!!sellerProductGroupsEntities.find(entity => entity.productGroupId === productGroupId)) continue;
      await SellerProductGroups.create(
        {
          userId,
          productGroupId,
        },
        {
          transaction,
        },
      );
    }

    for (const entity of sellerProductGroupsEntities) {
      if (productGroupIds.includes(entity.productGroupId)) continue;
      await entity.destroy({
        force: true,
        transaction,
      });
    }

    const sellerAutoBrands = await SellerAutoBrands.findAll({
      where: {
        userId,
      },
      transaction,
    });
    const sellerProductGroups = await SellerProductGroups.findAll({
      where: {
        userId,
      },
      transaction,
    });
    const orderRequests = await OrderRequest.findAll({
      where: {
        status: {
          [Op.in]: ['REQUESTED', 'APPROVED'],
        },
      },
      attributes: ['id', 'status', 'productIds'],
      transaction,
    });

    const allProductIds = _.uniq(orderRequests.flatMap(el => JSON.parse(el.productIds || '[]') as string[])).flatMap(
      item => item,
    );
    const allProducts = await Product.findAll({
      where: {
        id: allProductIds,
      },
      attributes: ['id', 'autoTypeIds', 'autoBrandIds', 'groupIds'],
      transaction,
    });

    for (const orderRequest of orderRequests) {
      const item = await OrderRequestSellerData.findOne({
        where: {
          sellerId: userId,
          orderRequestId: orderRequest.id,
        },
        transaction,
      });
      if (!item) continue;
      const sellerProductIds: string[] = [];
      const productIds: string[] = JSON.parse(orderRequest.productIds || '[]');
      const products = allProducts.filter(el => productIds.includes(el.id));

      for (const product of products) {
        const productAutoTypeIds: string[] = JSON.parse(product.autoTypeIds) || [];
        const productAutoBrandIds: string[] = JSON.parse(product.autoBrandIds) || [];
        const productGroupIds: string[] = JSON.parse(product.groupIds) || [];

        for (const autoTypeId of productAutoTypeIds) {
          if (!!sellerProductIds.find(el => el === product.id)) break;

          for (const autoBrandId of productAutoBrandIds) {
            if (!!sellerAutoBrands.find(el => el.autoTypeId === autoTypeId && el.autoBrandId === autoBrandId)) {
              const autoBrand = await AutoBrand.findByPk(autoBrandId, {
                attributes: ['id', 'activeAutoTypeIds'],
                transaction,
              });
              if (autoBrand?.activeAutoTypeIds?.includes(autoTypeId)) {
                sellerProductIds.push(product.id);
                break;
              }
            }
          }
        }
        if (!productAutoTypeIds?.length) {
          for (const autoBrandId of productAutoBrandIds) {
            if (!!sellerAutoBrands.find(el => el.autoBrandId === autoBrandId)) {
              sellerProductIds.push(product.id);
              break;
            }
          }
        }

        for (const productGroupId of productGroupIds) {
          if (!!sellerProductGroups.find(el => el.productGroupId === productGroupId)) {
            if (!!sellerProductIds.find(el => el === product.id)) continue;
            sellerProductIds.push(product.id);
            break;
          }
        }
      }

      await item.update(
        {
          productsNumber: sellerProductIds.length,
          productIds: JSON.stringify(sellerProductIds),
        },
        {
          transaction,
        },
      );
    }
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при обновлении категорий товаров',
    });
  }
};
