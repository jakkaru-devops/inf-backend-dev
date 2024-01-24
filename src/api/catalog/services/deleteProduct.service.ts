import { Transaction } from 'sequelize';
import AutoBrand from '../models/AutoBrand.model';
import AutoType from '../models/AutoType.model';
import Product from '../models/Product.model';
import ProductBranch from '../models/ProductBranch.model';
import UserRoles from '../../role/models/UserRoles.model';
import _ from 'lodash';
import { checkAndHideAutoBrandService } from './checkAndHideAutoBrand.service';
import RequestProduct from '../../order/models/RequestProduct.model';
import catalogService from '../catalog.service';
import { PRODUCT_STATUSES } from '../data';

interface IProps {
  id: Product['id'];
  authUserRole: UserRoles;
}

export const deleteProductService = async (
  { id, authUserRole }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  let allProductAutoTypeIds: string[] = [];
  let allProductAutoBrandIds: string[] = [];
  const productEntity = await Product.findByPk(id, {
    include: [
      {
        model: AutoType,
        as: 'autoTypes',
        attributes: ['id'],
        required: false,
      },
      {
        model: AutoBrand,
        as: 'autoBrands',
        attributes: ['id'],
        required: false,
      },
    ],
    transaction,
  });
  const branches = await ProductBranch.findAll({
    where: {
      productId: productEntity.id,
    },
  });
  const cats = {
    autoTypeIds: _.uniq(branches.map(branch => branch?.autoTypeId).filter(Boolean)),
    autoBrandIds: _.uniq(branches.map(branch => branch?.autoBrandId).filter(Boolean)),
    autoModelIds: _.uniq(
      branches.flatMap(branch => JSON.parse(branch?.autoModelIds || '[]') as string[]).filter(Boolean),
    ),
    groupIds: _.uniq(branches.map(branch => branch?.groupId).filter(Boolean)),
    subgroupIds: _.uniq(branches.map(branch => branch?.subgroupId).filter(Boolean)),
  };

  for (const branch of branches) {
    if (!!branch?.autoTypeId) allProductAutoTypeIds.push(branch?.autoTypeId);
    if (!!branch?.autoBrandId) allProductAutoBrandIds.push(branch?.autoBrandId);

    await catalogService.deleteProductBranch(
      {
        branchId: branch.id,
      },
      { transaction },
    );
  }

  if (authUserRole.role.label === 'moderator') {
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

  // Handle request products
  await RequestProduct.update(
    {
      reserveName: productEntity.name_ru,
      reserveManufacturer: productEntity.manufacturer,
      reserveArticle: productEntity.article,
    },
    {
      where: {
        productId: productEntity.id,
      },
      transaction,
    },
  );

  if (productEntity.status === PRODUCT_STATUSES.SALE) {
    await catalogService.updateCategoriesForSale({
      ...cats,
      transaction,
    });
  }

  await productEntity.destroy({
    transaction,
  });

  return productEntity;
};
