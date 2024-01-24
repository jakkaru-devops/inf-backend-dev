import { Transaction } from 'sequelize';
import Product from '../models/Product.model';
import User from '../../user/models/User.model';
import { IUpdateProductDto } from '../interfaces/dto';
import { Sale } from '../models/Sale.model';
import { PRODUCT_STATUSES } from '../data';
import catalogService from '../catalog.service';
import UserRoles from '../../role/models/UserRoles.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import organizationsService from '../../organization/organizations.service';
import { entityToJSON, transformEntityLocale } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';

interface IProps {
  productData: IUpdateProductDto;
  saleData: Sale;
  authUser: User;
  authUserRole: UserRoles;
}

export const updateSaleProductService = async (
  { productData, saleData, authUser, authUserRole }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const sale = await Sale.findByPk(saleData.id, { transaction });
  let product = await Product.findByPk(sale.productId, { transaction });

  if (!product || !sale) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Товар не найден' });

  if (sale.userId !== authUser.id)
    throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Обновление товара запрещено' });

  if (product.status === PRODUCT_STATUSES.SALE) {
    product = await catalogService.updateProduct({ ...productData, id: product.id, authUserRole }, { transaction });
  }

  if (saleData.organizationId !== sale.organizationId) {
    const { organizationBranch } = await organizationsService.getOrganizationSellerData(
      {
        userId: authUser.id,
        organizationId: saleData.organizationId,
      },
      { transaction },
    );
    const supplierAddress = await Address.findByPk(organizationBranch.actualAddressId, { transaction });

    await sale.update(
      {
        organizationId: saleData.organizationId,
        supplierAddressId: supplierAddress.id,
        regionId: supplierAddress.regionFiasId,
      },
      { transaction },
    );
  }

  const priceOffer = await catalogService.updateProductPriceOffer(
    {
      priceOfferId: sale.priceOfferId,
      price: saleData.price,
      previousPrice: saleData.previousPrice,
      amount: saleData.amount,
      organizationId: saleData.organizationId,
      product,
      sellerId: authUser.id,
    },
    { transaction },
  );

  product.sale = {
    ...entityToJSON(sale),
    price: priceOffer.price,
    previousPrice: priceOffer.previousPrice,
    amount: priceOffer.amount,
  } as Sale;
  product = transformEntityLocale(product);

  return product;
};
