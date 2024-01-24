import { Transaction } from 'sequelize';
import Product from '../models/Product.model';
import catalogService from '../catalog.service';
import { PRODUCT_STATUSES } from '../data';
import User from '../../user/models/User.model';
import UserRoles from '../../role/models/UserRoles.model';
import { entityToJSON, transformEntityLocale } from '../../../utils/common.utils';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import { Sale } from '../models/Sale.model';
import { ICreateProductDto } from '../interfaces/dto';
import organizationsService from '../../organization/organizations.service';
import Address from '../../address/models/Address.model';

interface IProps {
  productData: ICreateProductDto;
  saleData: Sale;
  authUser: User;
  authUserRole: UserRoles;
}

export const createSaleProductService = async (
  { productData, saleData, authUser, authUserRole }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  let product: Product = null;
  const { organizationId } = saleData;

  // Create or check if source product exists
  if (!productData.sourceProductId) {
    product = await catalogService.createProduct(
      {
        ...productData,
        status: PRODUCT_STATUSES.SALE,
        userId: authUser.id,
        authUserRole,
      },
      { transaction },
    );
  } else {
    product = await Product.findByPk(productData.sourceProductId, { transaction });
    if (!product)
      throw new ServiceError({
        status: httpStatus.NOT_FOUND,
        message: 'Родительский товар не найден',
      });
  }

  const { organizationSeller, organizationBranch } = await organizationsService.getOrganizationSellerData(
    {
      userId: authUser.id,
      organizationId,
    },
    { transaction },
  );

  if (!organizationSeller) throw new ServiceError({ status: httpStatus.FORBIDDEN, message: 'Недостаточно прав' });

  // Save prices and amount
  const priceOffer = await catalogService.createProductPriceOffer(
    {
      price: saleData.price,
      previousPrice: saleData.previousPrice,
      amount: saleData.amount,
      organizationId,
      organizationBranch,
      productId: product.id,
      product,
      userId: authUser.id,
      forSale: true,
    },
    { transaction },
  );
  const supplierAddress = await Address.findByPk(organizationBranch.actualAddressId, { transaction });
  const sale = await Sale.create(
    {
      productId: product.id,
      userId: authUser.id,
      priceOfferId: priceOffer.id,
      organizationId,
      supplierAddressId: supplierAddress.id,
      regionId: supplierAddress.regionFiasId,
    },
    { transaction },
  );

  product = transformEntityLocale(product);
  product.sale = {
    ...entityToJSON(sale),
    price: priceOffer.price,
    previousPrice: priceOffer.previousPrice,
    amount: priceOffer.amount,
  } as Sale;

  return product;
};
