import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { URL_ACAT, URL_ACAT_V2 } from '../data';
import Product from '../../catalog/models/Product.model';
import { executeTransaction } from '../../../utils/transactions.utils';
import axios from 'axios';
import {
  ACAT_CATALOG_TOKEN,
  EXTERNAL_CATALOG_URL,
  LAXIMO_CARS_BASE_URL,
  LAXIMO_TRUCKS_BASE_URL,
} from '../../../config/env';
import CartProduct from '../../cart/models/CartProduct.model';
import User from '../../user/models/User.model';
import { copyAcatProductService } from '../services/copyAcatProduct.service';
import FavoriteProduct from '../../catalog/models/FavoriteProduct.model';
import ProductFile from '../../catalog/models/ProductFile.model';
import FileModel from '../../files/models/File.model';
import { transformEntityLocale } from '../../../utils/common.utils';
import _ from 'lodash';
import UserRoles from '../../role/models/UserRoles.model';
import { getAuthUser, getCurrentRole } from '../../../utils/auth.utils';
import EXTERNAL_AUTO_TYPES from '../data/externalAutoTypes.json';

class Acat {
  getAutoTypeList = async (req: Request, res: Response) => {
    try {
      const autoTypes = await axios({
        method: 'get',
        url: URL_ACAT_V2,
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      return APIResponse({
        res,
        data: autoTypes.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Виды техники не загружены',
        error: err,
      });
    }
  };

  getAutoBrand = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand } = req.query;

      const result = await axios({
        method: 'get',
        url: `${URL_ACAT}/${autoType}/${autoBrand}`,
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });

      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Марка авто не загружена',
        error: err,
      });
    }
  };

  getAutoModel = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand, autoModel } = req.query;

      const result = await axios({
        method: 'get',
        url: `${URL_ACAT}/${autoType}/${autoBrand}/${autoModel}`,
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });

      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Модель авто не загружена',
        error: err,
      });
    }
  };

  getProductGroup = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand, autoModel, productGroup } = req.query;

      const result = await axios({
        method: 'get',
        url: `${URL_ACAT}/${autoType}/${autoBrand}/${autoModel}/${productGroup}`,
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      // let image = (
      //   await axios({
      //     method: 'get',
      //     url: result.data.group.image,
      //     headers: {
      //       Authorization: ACAT_CATALOG_TOKEN,
      //     },
      //   })
      // ).data;

      return APIResponse({
        res,
        data: {
          ...result.data,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Группа товаров не загружена',
        error: err,
      });
    }
  };

  getAutoModelList = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand } = req.query;
      const result = await axios({
        method: 'get',
        url: `${URL_ACAT_V2}/models`,
        params: {
          type: autoType,
          mark: autoBrand,
        },
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      const data = result.data;
      data.models = data.models.filter(model => !model.archival);
      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список моделей не загружен',
        error: err,
      });
    }
  };

  getModificationList = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand, autoModel, page } = req.query;
      const result = await axios({
        method: 'get',
        url: `${URL_ACAT_V2}/modifications`,
        params: {
          type: autoType,
          mark: autoBrand,
          model: autoModel,
          page,
        },
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список модификаций не загружен',
        error: err,
      });
    }
  };

  getGroupList = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand, autoModel, modification, group } = req.query;
      const result = await axios({
        method: 'get',
        url: `${URL_ACAT_V2}/groups`,
        params: {
          type: autoType,
          mark: autoBrand,
          model: autoModel,
          modification,
          group,
        },
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список групп не загружен',
        error: err,
      });
    }
  };

  getPartList = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand, autoModel, modification, parentGroup, group } = req.query;
      const result = await axios({
        method: 'get',
        url: `${URL_ACAT_V2}/parts`,
        params: {
          type: autoType,
          mark: autoBrand,
          model: autoModel,
          modification,
          parentGroup,
          group,
        },
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });

      const imageUrl = result?.data?.image;
      if (!!imageUrl) {
        const imageRes = await axios({
          method: 'get',
          url: `${URL_ACAT_V2}/scheme`,
          params: {
            type: autoType,
            mark: autoBrand,
            model: autoModel,
            modification,
            parentGroup,
            group,
          },
          headers: {
            Authorization: ACAT_CATALOG_TOKEN,
          },
          responseType: 'arraybuffer',
        });
        if (imageRes?.status === 200) {
          result.data.imageBuffer = imageRes?.data;
        }
      }

      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список запчастей не загружен',
        error: err,
      });
    }
  };

  getSchemeImage = async (req: Request, res: Response) => {
    try {
      const { autoType, autoBrand, autoModel, modification, group, subgroup } = req.query;
      const result = await axios({
        method: 'get',
        url: `${URL_ACAT_V2}/scheme`,
        params: {
          type: autoType,
          mark: autoBrand,
          model: autoModel,
          modification,
          parentGroup: group,
          group: subgroup,
        },
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Схема не загружена',
        error: err,
      });
    }
  };

  /**
   * @desc      Allows you to get catalog data: Car types, brands, models, modifications and spare parts.
   * @route     GET /external
   * @success  { data: 'Depending on the query parameters' }
   * @query     ?type=<CARS_NATIVE>&mark=<VAZ>&model=<58960>&numbers=<3373370> || brands=all
   * @access    Public
   */
  getCatalog = async (req: Request, res: Response) => {
    try {
      if (!req.path || req.path === '/') {
        return APIResponse({
          res,
          data: EXTERNAL_AUTO_TYPES,
        });
      }

      if (!!EXTERNAL_CATALOG_URL) {
        const result = await axios.get(EXTERNAL_CATALOG_URL, {
          params: req.query,
        });
        return APIResponse({
          res,
          data: result.data?.data,
        });
      }

      const result = await axios({
        method: 'get',
        url: `${URL_ACAT}/${req?.query?.path || ''}`,
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });

      if (!!result?.data?.group) {
        const group = result?.data?.group;
        const imageRes = await axios({
          method: 'get',
          url: `https:${(group?.img || group?.image)?.replace('https:', '')}`.replace('/r/250x250', ''),
          headers: {
            Authorization: ACAT_CATALOG_TOKEN,
          },
          responseType: 'arraybuffer',
        });
        if (imageRes?.status === 200) {
          result.data.group.imageBuffer = imageRes?.data;
        }
      }

      console.log('QUERY', req.query);
      if (!req?.query?.path?.length) {
        console.log('PATH', `${LAXIMO_TRUCKS_BASE_URL}/catalog/all`);
        const laximoCatalogs = await Promise.all([
          await axios({
            method: 'get',
            url: `${LAXIMO_TRUCKS_BASE_URL}/catalog/all`,
          }),
          await axios({
            method: 'get',
            url: `${LAXIMO_CARS_BASE_URL}/catalog/all`,
          }),
        ]);
        console.log('LAXIMO', laximoCatalogs);
        const acatTrucks = result.data
          .find(obj => obj.value == 'TRUCKS_FOREIGN')
          .marks.map(truckBrand => ({
            ...truckBrand,
            name: _.upperCase(truckBrand.name),
          }));

        const acatCars = result.data
          .find(obj => obj.value == 'CARS_FOREIGN')
          .marks.map(truckBrand => ({
            ...truckBrand,
            name: _.upperCase(truckBrand.name),
          }))
          .filter(carBrand => carBrand.value !== 'ssangyong');

        console.log(laximoCatalogs);

        const newLaximo = laximoCatalogs.map((catalog, index) =>
          catalog.data.data.catalogs
            .map(brand => _.mapKeys(brand, (_, key) => (key == 'name' ? 'name2' : key)))
            .map(brand => _.mapKeys(brand, (_, key) => (key == 'brand' ? 'name' : key)))
            .map(brand => ({ ...brand, laximo: true, urlType: index == 0 ? 'trucks' : 'cars' }))
            .map(brand => ({ ...brand, name: brand.name.replace(/-/g, ' ') })),
        );

        const newTrucksResponse = _.unionBy<any>(newLaximo[0], acatTrucks, 'name')
          .map(truckBrand => ({ ...truckBrand, name: _.lowerCase(truckBrand.name) }))
          .map(truckBrand => ({
            ...truckBrand,
            name: truckBrand.name.replace(/(^|\s)\S/g, function (a) {
              return a.toUpperCase();
            }),
          }));

        const newCarsResponse = _.unionBy<any>(
          newLaximo[1].filter(brand => brand.code !== 'BMWMR201910'),
          acatCars,
          'name',
        )
          .map(carsBrand => ({ ...carsBrand, name: _.lowerCase(carsBrand.name) }))
          .map(carsBrand => ({
            ...carsBrand,
            name: carsBrand.name.replace(/(^|\s)\S/g, function (a) {
              return a.toUpperCase();
            }),
          }));

        const trucksIndex = _.findIndex(result.data, { value: 'TRUCKS_FOREIGN' });
        const carsIndex = _.findIndex(result.data, { value: 'CARS_FOREIGN' });

        result.data[trucksIndex].marks = _.orderBy(newTrucksResponse, 'name', 'asc');
        result.data[carsIndex].marks = _.orderBy(newCarsResponse, 'name', 'asc');

        return APIResponse({
          res,
          data: result.data,
        });
      }

      return APIResponse({
        res,
        data: result.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при загрузке данных каталога',
        error: err.message,
      });
    }
  };

  getImage = async (req: Request, res: Response) => {
    try {
      const imageRes = await axios({
        method: 'get',
        url: (req?.query?.url as string) || `${URL_ACAT}/${req?.query?.path || ''}/image`,
        headers: {
          Authorization: ACAT_CATALOG_TOKEN,
        },
      });
      return APIResponse({
        res,
        data: imageRes.data,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при загрузке изображения',
        error: err.message,
      });
    }
  };

  copyProduct = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const productData: {
          id: string;
          name: string;
          article: string;
          autoType: string;
          autoBrand: string;
          autoModel: string;
          group: string;
          subgroup: string;
        } = req.body.product;

        let authUserRole: UserRoles = null;
        const { authUser, error } = await getAuthUser(req);
        if (!error && !!authUser) {
          authUserRole = getCurrentRole(req, authUser);
        }

        let product = (
          await copyAcatProductService({
            productData,
            authUserRole,
            res,
            transaction,
          })
        ).product;

        product = await Product.findByPk(product.id, {
          include: [
            {
              model: ProductFile,
              as: 'productFiles',
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
          transaction,
        });
        product = transformEntityLocale(product);

        return APIResponse({
          res,
          data: product,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Товар не перенесен',
          error: err,
        });
      }
    });
  };

  addCartProduct = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const productData: {
          id: string;
          name: string;
          article: string;
          autoType: string;
          autoBrand: string;
          autoModel: string;
          group: string;
          subgroup: string;
        } = req.body.product;
        const quantity = req.body.quantity;

        const product = (
          await copyAcatProductService({
            productData,
            authUserRole,
            res,
            transaction,
          })
        ).product;

        const cartProduct = await CartProduct.create(
          {
            userId: authUser.id,
            productId: product.id,
            quantity,
            acatProductId: productData.id,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: cartProduct,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Товар не добавлен в корзину',
          error: err,
        });
      }
    });
  };

  addFavoriteProduct = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const productData: {
          id: string;
          name: string;
          article: string;
          autoType: string;
          autoBrand: string;
          autoModel: string;
          group: string;
          subgroup: string;
        } = req.body.product;

        const product = (
          await copyAcatProductService({
            productData,
            authUserRole,
            res,
            transaction,
          })
        ).product;

        const favoriteProduct = await FavoriteProduct.create(
          {
            userId: authUser.id,
            productId: product.id,
            acatProductId: productData.id,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: favoriteProduct,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Товар не добавлен в избранные',
          error: err,
        });
      }
    });
  };
}

export default Acat;
