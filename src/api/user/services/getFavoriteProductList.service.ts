import { Op } from 'sequelize';
import Product from '../../catalog/models/Product.model';
import User from '../models/User.model';
import FavoriteProduct from '../../catalog/models/FavoriteProduct.model';
import { transformEntityLocale } from '../../../utils/common.utils';
import StockBalance from '../../catalog/models/StockBalance.model';
import Warehouse from '../../catalog/models/Warehouse.model';
import Organization from '../../organization/models/Organization.model';
import { getOrgName } from '../../organization/utils';

interface IProps {
  userId: User['id'];
}

export const getFavoriteProductListService = async ({ userId }: IProps) => {
  const favoriteProducts = await FavoriteProduct.findAndCountAll({
    where: {
      userId,
    },
    include: [{ model: Product, as: 'product', required: true }],
  });
  if (!favoriteProducts?.rows?.length) return favoriteProducts;

  favoriteProducts.rows = favoriteProducts.rows.map(
    el =>
      ({
        ...el?.toJSON(),
        product: transformEntityLocale(el.product),
      } as FavoriteProduct),
  );

  const priceOfferIds = favoriteProducts.rows.map(el => el?.priceOfferId).filter(Boolean);
  let priceOffers: StockBalance[] = [];
  let organizations: Organization[] = [];

  if (!!priceOfferIds?.length) {
    priceOffers = (
      await StockBalance.findAll({
        where: {
          id: { [Op.in]: priceOfferIds },
        },
        include: [{ model: Warehouse, as: 'warehouse', required: true }],
      })
    ).map(el => el?.toJSON() as StockBalance);
    organizations = (
      await Organization.findAll({
        where: {
          id: { [Op.in]: priceOffers.map(el => el.warehouse.organizationId) },
        },
      })
    ).map(el => el?.toJSON() as Organization);
  }

  for (const favoriteProduct of favoriteProducts.rows) {
    const priceOffer = !!favoriteProduct?.priceOfferId
      ? priceOffers.find(el => el.id === favoriteProduct.priceOfferId)
      : null;
    const organization = organizations.find(el => el.id === priceOffer?.warehouse?.organizationId);

    if (organization)
      favoriteProduct.organization = {
        id: organization.id,
        name: getOrgName(organization, true, true),
      };
  }

  return favoriteProducts;
};
