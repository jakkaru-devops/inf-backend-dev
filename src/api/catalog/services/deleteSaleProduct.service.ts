import { Transaction } from 'sequelize';
import Product from '../models/Product.model';
import { Sale } from '../models/Sale.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import { PRODUCT_STATUSES } from '../data';
import catalogService from '../catalog.service';
import User from '../../user/models/User.model';
import UserRoles from '../../role/models/UserRoles.model';

interface IProps {
  saleId: Sale['id'];
  authUser: User;
  authUserRole: UserRoles;
}

export const deleteSaleProductService = async (
  { saleId, authUser, authUserRole }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const sale = await Sale.findByPk(saleId, { transaction });
  let product = await Product.findByPk(sale.productId, { transaction });

  if (!sale || !product) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Товар не найден' });

  if (sale.userId !== authUser.id)
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Удаление товара запрещено' });

  if (product.status === PRODUCT_STATUSES.SALE && product.userId === authUser.id) {
    product = await catalogService.deleteProduct({ id: product.id, authUserRole }, { transaction });
  }

  await sale.destroy({ force: true, transaction });
  await catalogService.deleteProductPriceOffer(
    {
      priceOfferId: sale.priceOfferId,
      product,
      sellerId: authUser.id,
      preventMinPriceUpdate: true,
    },
    { transaction },
  );

  return product;
};
