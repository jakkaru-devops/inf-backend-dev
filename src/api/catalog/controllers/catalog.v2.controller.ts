import { APIError } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import catalogService from '../catalog.service';
import { formatAutoBrand, formatAutoType, formatProductGroup } from '../utils/formatting.utils';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';

class CatalogV2Controller {
  getAutoTypeList = createAPIMethod(
    { errorMessage: 'Не удалось получить виды техники', runTransaction: false },
    async ({ req }) => {
      const params = req.query;
      const autoTypes = await catalogService.getAutoTypeList({ ...params });
      return {
        ...autoTypes,
        rows: autoTypes.rows.map(autoType => formatAutoType(autoType)),
      };
    },
  );

  getAutoBrandList = createAPIMethod(
    { errorMessage: 'Не удалось получить марки авто', runTransaction: false },
    async ({ req }) => {
      const params = req.query;
      const autoBrands = await catalogService.getAutoBrandList({ ...params });
      return {
        ...autoBrands,
        rows: autoBrands.rows.map(autoBrand =>
          formatAutoBrand(autoBrand, {
            include: ['autoTypeIds'],
          }),
        ),
      };
    },
  );

  getGroupList = createAPIMethod(
    { errorMessage: 'Не удалсоь получить категории товаров', runTransaction: false },
    async ({ req }) => {
      const params = req.query;
      const groups = await catalogService.getGroupList({ ...params });
      return {
        ...groups,
        rows: groups.rows.map(group => formatProductGroup(group)),
      };
    },
  );

  getProductPrices = createAPIMethod(
    { errorMessage: 'Не удалось получить цены на товар', runTransaction: false },
    async ({ req }) => {
      const { id: productId } = req.params;
      const priceGroups = await catalogService.getProductPrices({ productId });
      return priceGroups;
    },
  );

  getSuppliersByProduct = createAPIMethod(
    { errorMessage: 'Не удалось найти поставщиков товара', runTransaction: false },
    async ({ req }) => {
      const { productId } = req.params;
      return await catalogService.getSuppliersByProduct({ productId });
    },
  );

  getSaleProductList = createAPIMethod(
    { errorMessage: 'Не удалось получить список товаров', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      let { autoType, autoBrand, autoModel, group, subgroup, search, exactSearch, searchFields, orderBy, region } =
        req.query as any;

      return await catalogService.getSaleProductList({
        sellerId: authUserRole.role.label === 'seller' ? authUser.id : null,
        orderBy,
        search,
        exactSearch,
        exactSearchBy: 'article',
        searchFields,
        region,
        autoType,
        autoBrand,
        autoModel,
        group,
        subgroup,
        pagination: req.query,
      });
    },
  );

  getSaleProduct = createAPIMethod(
    { errorMessage: 'Не удалось загрузить товар', runTransaction: false },
    async ({ req }) => {
      const { saleId } = req.params;
      const { mode } = req.query as any;

      return await catalogService.getSaleProduct({ saleId: Number(saleId), mode }, { transaction: null });
    },
  );

  createSaleProduct = createAPIMethod(
    { errorMessage: 'Не удалось добавить товар в распродажу', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      const { product: productData, sale: saleData } = req.body;

      if (authUserRole.role.label !== 'seller')
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Только продавец может добавлять товары для распродажи',
        });

      return await catalogService.createSaleProduct(
        {
          productData,
          saleData,
          authUser,
          authUserRole,
        },
        { transaction },
      );
    },
  );

  updateSaleProduct = createAPIMethod(
    { errorMessage: 'Не удалось обновить товар в распродаже', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      const { saleId } = req.params;
      const { product: productData, sale: saleData } = req.body;

      if (authUserRole.role.label !== 'seller')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Недостаточно прав' });

      return await catalogService.updateSaleProduct(
        {
          productData,
          saleData: { ...saleData, id: Number(saleId) },
          authUser,
          authUserRole,
        },
        { transaction },
      );
    },
  );

  deleteSaleProduct = createAPIMethod(
    { errorMessage: 'Не удалось удалить товар из распродажи', runTransaction: true },
    async ({ req, res, authUser, authUserRole, transaction }) => {
      const { saleId } = req.params;

      if (authUserRole.role.label !== 'seller')
        throw APIError({ res, status: httpStatus.FORBIDDEN, message: 'Недостаточно прав' });

      return await catalogService.deleteSaleProduct(
        { saleId: Number(saleId), authUser, authUserRole },
        { transaction },
      );
    },
  );
}

export default CatalogV2Controller;
