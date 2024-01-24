import { Transaction } from 'sequelize';
import { Sale } from '../models/Sale.model';
import { IGetProductIncludeItem } from './getProduct.service';
import catalogService from '../catalog.service';
import { entityToJSON } from '../../../utils/common.utils';
import Organization from '../../organization/models/Organization.model';
import Address from '../../address/models/Address.model';
import User from '../../user/models/User.model';
import StockBalance from '../models/StockBalance.model';

interface IProps {
  saleId: Sale['id'];
  mode: 'read' | 'edit';
}

export const getSaleProductService = async (
  { saleId, mode = 'read' }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const sale = await Sale.findByPk(saleId, {
    include: [
      { model: Organization, as: 'organization', required: true },
      { model: Address, as: 'supplierAddress', required: true },
      { model: User, as: 'user', required: true },
    ],
    transaction,
  });
  const include: IGetProductIncludeItem[] =
    mode === 'read' ? ['files', 'categoriesView'] : ['files', 'allCategories', 'branches'];
  let product = await catalogService.getProduct({ id: sale.productId, include });
  const priceOffer = await StockBalance.findByPk(sale.priceOfferId, { transaction });

  product.sale = {
    ...entityToJSON(sale),
    price: priceOffer.price,
    previousPrice: priceOffer.previousPrice,
    amount: priceOffer.amount,
  } as Sale;

  return product;
};
