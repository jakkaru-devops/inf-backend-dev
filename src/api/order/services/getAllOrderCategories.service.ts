import _ from 'lodash';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import AutoType from '../../catalog/models/AutoType.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import DescribedProductAutoBrands from '../../catalog/models/DescribedProductAutoBrands.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import OrderRequest from '../models/OrderRequest.model';

interface IProps {
  order: OrderRequest;
}

export const getAllOrderCategoriesService = async ({ order }: IProps) => {
  const products = order.products.map(requestProduct => requestProduct?.product).filter(Boolean);
  const describedProducts = order.products.map(requestProduct => requestProduct?.describedProduct).filter(Boolean);

  let categories: string[] = [];

  if (!!products?.length) {
    const branches = await ProductBranch.findAll({
      where: {
        productId: products.map(el => el.id),
      },
      include: [
        { model: AutoType, as: 'autoType', required: false },
        { model: AutoBrand, as: 'autoBrand', required: false },
        { model: ProductGroup, as: 'group', required: false },
      ],
    });

    for (const branch of branches) {
      if (['AUTO_PRODUCTS', 'AUTO_TOOLS'].includes(branch?.group?.catalog)) {
        categories.push(`${branch.group?.name_ru}`);
      } else {
        if (!!branch?.autoType && !!branch?.autoBrand)
          categories.push(`${branch?.autoBrand.name_ru} (${branch?.autoType.name_ru})`);
      }
    }
  }
  if (!!describedProducts?.length) {
    for (const describedProductBasic of describedProducts) {
      const describedProduct = await DescribedProduct.findByPk(describedProductBasic.id, {
        include: [
          {
            model: DescribedProductAutoBrands,
            as: 'autoBrandsData',
            required: false,
            include: [
              { model: AutoType, as: 'autoType', required: false },
              { model: AutoBrand, as: 'autoBrand', required: false },
            ],
          },
          { model: ProductGroup, as: 'productGroup', required: false },
        ],
      });
      if (!describedProduct) continue;

      if (!!describedProduct?.autoBrandsData) {
        for (const item of describedProduct?.autoBrandsData) {
          if (!!item?.autoType && !!item?.autoBrand)
            categories.push(`${item?.autoBrand.name_ru} (${item?.autoType.name_ru})`);
        }
      }
      if (!!describedProduct?.productGroup) {
        categories.push(`${describedProduct?.productGroup?.name_ru}`);
      }

      const groupIds = describedProduct?.productGroupIds || [];
      for (const groupId of groupIds) {
        const group = await ProductGroup.findByPk(groupId);
        if (!group) continue;

        categories.push(`${group?.name_ru}`);
      }
    }
  }

  return _.uniq(categories.filter(Boolean));
};
