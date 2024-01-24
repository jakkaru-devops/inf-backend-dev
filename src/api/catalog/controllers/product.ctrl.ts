import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Op } from 'sequelize';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import FileModel from '../../files/models/File.model';
import { PRODUCT_STATUSES, PUBLIC_PRODUCT_STATUSES } from '../data';
import Product from '../models/Product.model';
import ProductFile from '../models/ProductFile.model';
import { ICartProduct, ICartProductBasic } from '../interfaces';
import _ from 'lodash';
import { IGetProductListProps, getProductListService } from '../services/getProductList.service';
import { createProductService } from '../services/createProduct.service';
import { getProductPreviewUrl } from '../utils';
import { IUpdateProductDto } from '../interfaces/dto';
import { updateProductService } from '../services/updateProduct.service';
import ProductAnalogs from '../models/ProductAnalogs.model';
import { getPaginationParams, transformEntityLocale } from '../../../utils/common.utils';
import AutoType from '../models/AutoType.model';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import { createProductAnalogService } from '../services/createProductAnalog.service';
import ProductApplicability from '../models/ProductApplicability.model';
import User from '../../user/models/User.model';
import UserRoles from '../../role/models/UserRoles.model';
import CartProduct from '../../cart/models/CartProduct.model';
import ProductBranch from '../models/ProductBranch.model';
import { getProductService, IGetProductIncludeItem } from '../services/getProduct.service';
import { deleteProductService } from '../services/deleteProduct.service';
import { getAuthUser } from '../../../utils/auth.utils';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import catalogService from '../catalog.service';

class ProductsCtrl {
  /**
   * @desc      Get list of products
   * @route     GET /catalog/products
   * @query     { pageSize?: number, page?: number, search?: string, orderBy?: string, orderDirection?: string }
   * @success 	{ rows: Product[], count: number }
   * @access    Public
   */
  getProductList = createAPIMethod(
    { errorMessage: 'Список товаров не загружен', runTransaction: false },
    async ({ req, res }) => {
      type ISearchField = 'name' | 'description' | 'article';
      const { query } = req;
      let { autoType, autoBrand, autoModel, group, subgroup }: any = query;
      const search = (req.query?.search || '') as string;
      const exactSearch = (req.query?.exactSearch || false) as boolean;
      const searchFields = (req.query?.searchFields || ['name', 'description', 'article']) as ISearchField[];
      const productIds = [].concat(req.query?.productIds as string[]).filter(Boolean);
      const excludeIds = req.query?.excludeIds as string[];
      const { orderBy, orderDirection } = req.query as any;

      const props: IGetProductListProps = {
        search,
        exactSearch,
        exactSearchBy: 'article',
        searchFields,
        orderBy,
        orderDirection,
        productIds,
        excludeIds,
        autoType,
        autoBrand,
        autoModel,
        group,
        subgroup,
        include: ['files'],
        pagination: query,
      };

      // Fetch products
      let products = await catalogService.getProductList(props);

      // Fetch products again if they are not found with exactSearchBy
      if (!products?.count) {
        delete props.exactSearchBy;
        products = await catalogService.getProductList(props);
      }

      return products;
    },
  );

  getProductListByIds = async (req: Request, res: Response) => {
    try {
      const ids = req.query.ids as string[];

      let products = await Product.findAll({
        where: {
          id: ids,
        },
        include: [
          {
            model: ProductFile,
            as: 'productFiles',
            required: false,
            include: [{ model: FileModel, as: 'file' }],
          },
        ],
      });
      products = products.map(product => ({
        ...transformEntityLocale(product),
        preview: getProductPreviewUrl(product),
        length: product.length || null,
        width: product.width || null,
        height: product.height || null,
      })) as Product[];

      return APIResponse({
        res,
        data: products,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список товаров не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get product
   * @route     GET /catalog/products/:id
   * @params    id
   * @success 	Product
   * @access    Public
   */
  getProduct = createAPIMethod({ errorMessage: 'Товар не загружен', runTransaction: false }, async ({ req }) => {
    const { id } = req.params;
    const include = (req.query?.include || []) as IGetProductIncludeItem[];
    const product = await getProductService({ id, include });
    return { product };
  });

  createProduct = createAPIMethod(
    { errorMessage: 'Не удалось добавить товар', runTransaction: true },
    async ({ req, authUser, authUserRole, transaction }) => {
      const productData = req.body?.product;

      let product = await catalogService.createProduct(
        {
          ...productData,
          status: PRODUCT_STATUSES.DEFAULT,
          userId: authUser.id,
          authUserRole,
        },
        { transaction },
      );

      product = transformEntityLocale(product);

      return { product };
    },
  );

  getProductAnalogs = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const productId = req.params.id;

      const analogs = await ProductAnalogs.findAndCountAll({
        ...getPaginationParams(query, 12),
        order: [['createdAt', 'ASC']],
        where: {
          productId,
        },
      });

      const analogProducts = await Product.findAll({
        where: {
          id: analogs.rows.map(item => item.analogId),
        },
        order: [['createdAt', 'ASC']],
      });

      const result = {
        count: analogs.count,
        rows: analogProducts.map(item => transformEntityLocale(item)),
      };

      return APIResponse({
        res,
        data: result,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Аналоги товара не загружены',
        error: err,
      });
    }
  };

  getRecommendedProducts = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const productId = req.params.id;
      const limit = Number(query?.limit || 4);

      const product = await Product.findOne({
        where: {
          id: productId,
        },
      });
      const productAutoBrandIds: string[] = JSON.parse(product.autoBrandIds || '[]');
      const productGroupIds: string[] = JSON.parse(product.groupIds || '[]');
      const productSubgroupIds: string[] = JSON.parse(product.subgroupIds || '[]');

      let recommendedProducts = await Product.findAll({
        order: [['createdAt', 'ASC']],
        limit,
        where: {
          id: {
            [Op.ne]: productId,
          },
          status: PUBLIC_PRODUCT_STATUSES,
          autoBrandIds: {
            [Op.or]: productAutoBrandIds.map(id => ({
              [Op.substring]: id,
            })),
          },
          groupIds: {
            [Op.or]: productGroupIds.map(id => ({
              [Op.substring]: id,
            })),
          },
          subgroupIds: {
            [Op.or]: productSubgroupIds.map(id => ({
              [Op.substring]: id,
            })),
          },
        },
        include: [
          {
            model: ProductFile,
            as: 'productFiles',
            separate: true,
            required: false,
            include: [{ model: FileModel, as: 'file' }],
          },
        ],
      });

      let moreProducts: Product[] = [];

      if (recommendedProducts.length < limit) {
        moreProducts = await Product.findAll({
          order: [['createdAt', 'ASC']],
          limit: limit - recommendedProducts.length,
          where: {
            id: {
              [Op.and]: recommendedProducts
                .map(el => el.id)
                .concat(productId)
                .map(el => ({
                  [Op.ne]: el,
                })),
            },
            status: PUBLIC_PRODUCT_STATUSES,
            autoBrandIds: {
              [Op.or]: productAutoBrandIds.map(id => ({
                [Op.substring]: id,
              })),
            },
            groupIds: {
              [Op.or]: productGroupIds.map(id => ({
                [Op.substring]: id,
              })),
            },
          },
          include: [
            {
              model: ProductFile,
              as: 'productFiles',
              separate: true,
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
        });

        recommendedProducts = recommendedProducts.concat(moreProducts);
      }
      if (recommendedProducts.length < limit) {
        moreProducts = await Product.findAll({
          order: [['createdAt', 'ASC']],
          limit: limit - recommendedProducts.length,
          where: {
            id: {
              [Op.and]: recommendedProducts
                .map(el => el.id)
                .concat(productId)
                .map(el => ({
                  [Op.ne]: el,
                })),
            },
            status: PUBLIC_PRODUCT_STATUSES,
            autoBrandIds: {
              [Op.or]: productAutoBrandIds.map(id => ({
                [Op.substring]: id,
              })),
            },
          },
          include: [
            {
              model: ProductFile,
              as: 'productFiles',
              separate: true,
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
        });

        recommendedProducts = recommendedProducts.concat(moreProducts);
      }
      if (recommendedProducts.length < limit) {
        moreProducts = await Product.findAll({
          order: [['createdAt', 'ASC']],
          limit: limit - recommendedProducts.length,
          where: {
            id: {
              [Op.and]: recommendedProducts
                .map(el => el.id)
                .concat(productId)
                .map(el => ({
                  [Op.ne]: el,
                })),
            },
            status: PUBLIC_PRODUCT_STATUSES,
            groupIds: {
              [Op.or]: productGroupIds.map(id => ({
                [Op.substring]: id,
              })),
            },
          },
          include: [
            {
              model: ProductFile,
              as: 'productFiles',
              separate: true,
              required: false,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
        });

        recommendedProducts = recommendedProducts.concat(moreProducts);
      }

      return APIResponse({
        res,
        data: recommendedProducts.map(item => ({
          ...transformEntityLocale(item),
          preview: getProductPreviewUrl(item),
        })),
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Рекомендованные товары не загружены',
        error: err,
      });
    }
  };

  /**
   * @desc      Create product analog
   * @route     POST /product/analog
   * @body      { product: ICreateProductAnalogDto }
   * @success 	ProductAnalog
   * @access    Moderator
   */
  createProductAnalog = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { productId, analogId } = req.body;

        const { result, error } = await createProductAnalogService({ productId, analogId, transaction: t });

        if (error) {
          return APIError({
            res,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error while creating product analog',
            error: error as any,
          });
        }

        return APIResponse({
          res,
          data: {
            result,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error while creating product analog',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete product analog
   * @route     DELETE /product/analog
   * @body      { id: string }
   * @success 	ProductAnalog
   * @access    Private: moderator
   */
  deleteProductAnalog = async (req: Request, res: Response) => {
    try {
      const { id } = req.body.id;

      const productAnalogEntity = await ProductAnalogs.findByPk(id);
      await productAnalogEntity.destroy();

      return APIResponse({
        res,
        data: { message: 'Аналог удален' },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Аналог не удален',
        error: err,
      });
    }
  };

  updateProduct = createAPIMethod(
    { errorMessage: 'Не удалось обновить товар', runTransaction: true },
    async ({ req, authUser, authUserRole, transaction }) => {
      const { id } = req.params;
      const productData: IUpdateProductDto = req.body.product;

      let product = await catalogService.updateProduct(
        {
          ...productData,
          id,
          userId: authUser.id,
          authUserRole,
        },
        { transaction },
      );

      product = transformEntityLocale(product);

      return { product, message: 'Товар обновлен' };
    },
  );

  /**
   * @desc      Delete product
   * @route     DELETE /catalog/products/:id
   * @params    id
   * @success 	Product
   * @access    Private: moderator
   */
  deleteProduct = createAPIMethod(
    { errorMessage: 'Не удалось удалить товар', runTransaction: true },
    async ({ req, authUserRole, transaction }) => {
      const { id } = req.params;
      let product = await catalogService.deleteProduct({ id, authUserRole }, { transaction });
      if (!!product) product = transformEntityLocale(product);
      return { product, message: 'Товар удален' };
    },
  );

  getProductBranches = async (req: Request, res: Response) => {
    try {
      const { id: productId } = req.params;
      const autoType = req?.query?.autoType as string;
      const autoBrand = req?.query?.autoBrand as string;
      const requireDescription = req?.query?.requireDescription;
      const where: any = {};

      if (!!autoType) {
        const autoTypeEntity = await AutoType.findOne({
          where: {
            [Op.or]: [
              {
                id: autoType,
              },
              {
                label: autoType,
              },
            ],
          },
        });
        if (!!autoTypeEntity) where.autoTypeId = autoTypeEntity.id;
      }
      if (!!autoBrand) {
        const autoBrandEntity = await AutoBrand.findOne({
          where: {
            [Op.or]: [
              {
                id: autoBrand,
              },
              {
                label: autoBrand,
              },
            ],
          },
        });
        if (!!autoBrandEntity) where.autoBrandId = autoBrandEntity.id;
      }
      if (!!requireDescription) {
        where.description = {
          [Op.ne]: null,
        };
      }

      console.log('WHERE', where);

      if (!autoType && !autoBrand) {
        const branches = await ProductBranch.findAll({
          where: {
            isMain: true,
            productId,
            status: PUBLIC_PRODUCT_STATUSES,
          },
        });
        return APIResponse({
          res,
          data: {
            branches,
          },
        });
      }

      const branches = await ProductBranch.findAll({
        where: {
          ...where,
          productId,
          status: PUBLIC_PRODUCT_STATUSES,
        },
      });
      return APIResponse({
        res,
        data: {
          branches,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ветки товара не загружены',
        error: err,
      });
    }
  };

  getProductApplicabilities = async (req: Request, res: Response) => {
    try {
      const productId = req.params.id;

      const applicabilities = await ProductApplicability.findAndCountAll({
        ...getPaginationParams(req.query, 12),
        where: {
          productId: productId,
        },
        order: [['createdAt', 'ASC']],
        include: [
          {
            model: AutoType,
            as: 'autoType',
          },
          {
            model: AutoBrand,
            as: 'autoBrand',
          },
          {
            model: AutoModel,
            as: 'autoModel',
          },
        ],
      });

      applicabilities.rows = applicabilities.rows.map(item => ({
        ...transformEntityLocale(item),
        autoType: transformEntityLocale(item?.autoType),
        autoBrand: transformEntityLocale(item?.autoBrand),
        autoModel: transformEntityLocale(item?.autoModel),
      }));

      return APIResponse({
        res,
        data: applicabilities,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список применяемостей для товара не загружен',
      });
    }
  };

  /**
   * @desc      Get product list by product ids
   * @route     GET /catalog/cart-products
   * @query     { cartProducts: Array<{productId: string, count: number, createdAt: string}> }
   * @success 	{ rows: Array<ICartProduct>, count: number }
   * @access    Public
   */
  getCartProductList = async (req: Request, res: Response) => {
    try {
      let cartProductsBasic: ICartProductBasic[] = JSON.parse(req.body.cartProducts as string);
      const { offset, limit } = getPaginationParams(req.query, 10);

      cartProductsBasic = cartProductsBasic.filter(el => !!el.productId && !el.priceOfferId);

      // Return empty array if there are no ids in the request
      if (cartProductsBasic.length <= 0) {
        return APIResponse({
          res,
          data: {
            count: 0,
            rows: [],
          },
        });
      }
      const idList = cartProductsBasic.slice(offset, offset + limit).map(el => el.productId);

      const { authUser, error } = await getAuthUser(req);
      const cartProductEntities =
        authUser && !error
          ? await CartProduct.findAll({
              where: {
                userId: authUser.id,
                productId: idList,
                priceOfferId: null,
              },
            })
          : [];

      const products = await Product.findAndCountAll({
        limit,
        where: {
          id: idList,
        },
        include: [
          {
            model: ProductFile,
            as: 'productFiles',
            separate: true,
            include: [{ model: FileModel, as: 'file' }],
          },
        ],
      });

      let cartProducts: ICartProduct[] = products.rows
        .map(product => product.toJSON() as Product)
        .map(product => {
          const cartProductBasic = cartProductsBasic.find(el => el.productId === product.id);
          const cartProductData = cartProductEntities.find(el => el.productId === product.id);
          return {
            ...cartProductBasic,
            quantity: cartProductData?.quantity || cartProductBasic?.quantity,
            productId: product.id,
            product: {
              ...product,
              name: product.name_ru,
              preview: getProductPreviewUrl(product),
            } as any,
          };
        });
      cartProducts = _.orderBy(cartProducts, 'createdAt', 'asc');

      return APIResponse({
        res,
        data: {
          count: products.count,
          rows: cartProducts,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка. Товары из корзины не загружены',
        error: err,
      });
    }
  };
}

export default ProductsCtrl;
