import { Request, Response } from 'express';
import httpStatus from 'http-status';
import _ from 'lodash';
import seq, { Op } from 'sequelize';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { generateLabel, transformEntityLocale } from '../../../utils/common.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import { PRODUCT_CATEGORY_STATUSES, PUBLIC_PRODUCT_CATEGORY_STATUSES } from '../data';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import AutoType from '../models/AutoType.model';
import CatalogSection from '../models/CatalogSection.model';
import ProductGroup from '../models/ProductGroup.model';
import ProductAutoBrandRelations from '../models/relations/ProductAutoBrandRelations.model';
import ProductAutoModelRelations from '../models/relations/ProductAutoModelRelations.model';
import ProductGroupRelations from '../models/relations/ProductGroupRelations.model';
import { getCategoriesCombinedService } from '../services/getCategoriesCombined.service';
import { getAuthUser, getCurrentRole } from '../../../utils/auth.utils';
import SellerAutoBrands from '../models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../models/relations/SellerProductGroups.model';

class ProductCategoriesCtrl {
  getCategoriesCombined = async (req: Request, res: Response) => {
    try {
      const search = req.query.search as string;
      const result = await getCategoriesCombinedService({ search });
      return APIResponse({
        res,
        data: result,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Категории не загружены',
        error: err,
      });
    }
  };

  getAutoTypeList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const search = (query?.search || '') as string;
      const mode = req.query?.mode as 'saleEdit' | 'sale';
      let addRelatedProducts = false;

      const options: seq.FindAndCountOptions = {
        order: [['order', 'ASC']],
      };
      options.where = {
        [Op.and]: [],
      };

      if (!!search?.length) {
        options.where[Op.and].push({
          name_ru: {
            [Op.iLike]: `%${search}%`,
          },
        });
      }

      if (mode === 'saleEdit') {
        const { authUser, error } = await getAuthUser(req);
        if (!error && !!authUser) {
          const authUserRole = getCurrentRole(req, authUser);
          if (authUserRole.role.label === 'seller') {
            const sellerAutoBrands = await SellerAutoBrands.findAll({
              where: {
                userId: authUser.id,
              },
            });
            const sellerProductGroup = await SellerProductGroups.findOne({
              where: {
                userId: authUser.id,
              },
            });
            addRelatedProducts = !!sellerProductGroup;

            const autoTypeIds = _.uniq(sellerAutoBrands.map(item => item.autoTypeId));
            options.where[Op.and].push({ id: autoTypeIds });
          }
        }
      }
      if (mode === 'sale') {
        options.where[Op.and].push({
          forSale: true,
        });
      }

      const autoTypes = await AutoType.findAndCountAll(options);
      autoTypes.rows = autoTypes.rows.map(item => transformEntityLocale(item));

      if (addRelatedProducts) {
        autoTypes.rows.push({
          id: 'relatedProducts',
          label: 'relatedProducts',
          name: 'Сопутствующие товары',
          order: 99,
        } as any);
        autoTypes.count++;
      }

      return APIResponse({
        res,
        data: autoTypes,
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

  getAutoBrandList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let { autoType } = query;
      const search = (query?.search || '') as string;
      const mode = req.query?.mode as 'saleEdit' | 'sale';
      const showHidden = !!req.query?.showHidden;
      let autoTypesKey = 'activeAutoTypeIds';

      const options: seq.FindAndCountOptions = {
        include: [],
        order: [['name_ru', 'ASC']],
      };
      options.where = {
        [Op.and]: [],
      };

      if (!showHidden) {
        options.where[Op.and].push({
          isHidden: false,
          status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
        });
      }

      if (!!search?.length) {
        options.where[Op.and].push({
          name_ru: {
            [Op.iLike]: `%${search}%`,
          },
        });
      }

      if (mode === 'saleEdit') {
        const { authUser, error } = await getAuthUser(req);
        if (!error && !!authUser) {
          const authUserRole = getCurrentRole(req, authUser);
          if (authUserRole.role.label === 'seller') {
            const sellerAutoBrands = await SellerAutoBrands.findAll({
              where: {
                autoTypeId: autoType,
                userId: authUser.id,
              },
            });
            const autoBrandsIds = _.uniq(sellerAutoBrands.map(item => item.autoBrandId));
            options.where[Op.and].push({ id: autoBrandsIds });
          }
        }
      }
      if (mode === 'sale') {
        options.where[Op.and].push({
          forSale: true,
        });
        autoTypesKey = 'saleAutoTypeIds';
      }

      autoType = [].concat(autoType).filter(value => !!value && value !== 'undefined');
      const autoTypesRequired = autoType.length > 0;
      if (autoTypesRequired && !showHidden) {
        const autoTypeEntities = await AutoType.findAll({
          where: {
            [Op.or]: [{ id: autoType }, { label: autoType }],
          },
        });
        options.where[Op.and].push({
          [Op.or]: autoTypeEntities.map(autoTypeEntity => ({
            [autoTypesKey]: {
              [Op.substring]: autoTypeEntity.id,
            },
          })),
        });
      }

      const autoBrands = await AutoBrand.findAndCountAll(options);
      autoBrands.rows = _.orderBy(
        autoBrands.rows.map(item => transformEntityLocale(item)),
        'name',
        'asc',
      );

      return APIResponse({
        res,
        data: autoBrands,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Марки авто не загружены',
        error: err,
      });
    }
  };

  getAutoBrand = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      let autoBrand = await AutoBrand.findByPk(id);
      if (!autoBrand) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Марка авто не найдена',
        });
      }

      autoBrand = transformEntityLocale(autoBrand);

      return APIResponse({
        res,
        data: {
          autoBrand,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Марка авто не загружена',
      });
    }
  };

  createAutoBrand = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const name = req.body?.name?.trim();
        const label = generateLabel(name);

        if (!name?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Название заполнено некорректно',
          });
        }

        let autoBrand = await AutoBrand.findOne({
          where: {
            label,
          },
          transaction,
        });
        if (!!autoBrand) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Марка с таким названием уже существует',
          });
        }

        const catalogSection = await CatalogSection.findOne({
          transaction,
        });

        autoBrand = await AutoBrand.create(
          {
            label,
            name_ru: name,
            status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
            isHidden: true,
            activeAutoTypeIds: JSON.stringify([]),
            catalogSectionId: catalogSection.id,
          },
          {
            transaction,
          },
        );
        autoBrand = transformEntityLocale(autoBrand);

        return APIResponse({
          res,
          data: {
            autoBrand,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Марка авто не добавлена',
          error: err,
        });
      }
    });
  };

  updateAutoBrand = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.params.id;
        const name = req.body?.name?.trim();
        const label = generateLabel(name);

        if (!name?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Название заполнено некорректно',
          });
        }

        let autoBrand = await AutoBrand.findOne({
          where: {
            id,
          },
          transaction,
        });
        if (!autoBrand) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Марка не найдена',
          });
        }

        const existingAutoBrand = await AutoBrand.findOne({
          where: {
            id: {
              [Op.ne]: id,
            },
            label,
          },
          transaction,
        });
        if (!!existingAutoBrand) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Марка с таким названием уже существует',
          });
        }

        autoBrand = await autoBrand.update(
          {
            label,
            name_ru: name,
          },
          {
            transaction,
          },
        );
        autoBrand = transformEntityLocale(autoBrand);

        return APIResponse({
          res,
          data: {
            autoBrand,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Марка авто не обновлена',
          error: err,
        });
      }
    });
  };

  deleteAutoBrand = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.params.id;

        let autoBrand = await AutoBrand.findByPk(id, {
          transaction,
        });
        if (!autoBrand) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Марка не найдена',
          });
        }
        const productRelation = await ProductAutoBrandRelations.findOne({
          where: {
            autoBrandId: autoBrand.id,
          },
          transaction,
        });
        if (!!productRelation) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `Нельзя удалить марку с товарами`,
          });
        }

        await AutoModel.destroy({
          force: true,
          where: {
            autoBrandId: id,
          },
          transaction,
        });
        await AutoBrand.destroy({
          force: true,
          where: {
            id,
          },
          transaction,
        });
        autoBrand = transformEntityLocale(autoBrand);

        return APIResponse({
          res,
          data: {
            autoBrand,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Марка авто не удалена',
          error: err,
        });
      }
    });
  };

  getAutoModelList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let { autoType, autoBrand } = query;
      const search = (query?.search || '') as string;
      const showHidden = !!req.query?.showHidden;
      const mode = req.query?.mode as 'saleEdit' | 'sale';

      const options: seq.FindAndCountOptions = {
        // ...getPaginationParams(query),
        include: [],
        order: [['name_ru', 'ASC']],
      };
      options.where = {
        [Op.and]: [],
      };

      if (!showHidden) {
        options.where[Op.and].push({
          isHidden: false,
          status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
        });
      }

      if (mode === 'sale') {
        options.where[Op.and].push({
          forSale: true,
        });
      }

      autoBrand = [].concat(autoBrand).filter(value => !!value && value !== 'undefined');
      if (autoBrand.length === 0) {
        return APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Для получения моделей необходимо указать марку',
        });
      }

      if (!!search?.length) {
        options.where[Op.and].push({
          name_ru: {
            [Op.iLike]: `%${search}%`,
          },
        });
      }

      autoType = [].concat(autoType).filter(value => !!value && value !== 'undefined');
      if (autoType.length > 0) {
        options.include.push({
          model: AutoType,
          as: 'autoType',
          required: true,
          attributes: [],
          where: {
            [Op.or]: [{ id: autoType }, { label: autoType }],
          },
        });
      }

      autoBrand = [].concat(autoBrand).filter(value => !!value && value !== 'undefined');
      options.include.push({
        model: AutoBrand,
        as: 'autoBrand',
        required: true,
        attributes: [],
        where:
          autoBrand.length > 0
            ? {
                [Op.or]: [{ id: autoBrand }, { label: autoBrand }],
              }
            : {},
      });

      const autoModels = await AutoModel.findAndCountAll(options);
      autoModels.rows = autoModels.rows.map(item => transformEntityLocale(item));

      return APIResponse({
        res,
        data: autoModels,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Модели авто не загружены',
        error: err,
      });
    }
  };

  createAutoModel = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const name = req.body?.name?.trim();
        const label = generateLabel(name);
        const autoTypeId: string = req.body.autoTypeId;
        const autoBrandId: string = req.body.autoBrandId;

        if (!name?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Название заполнено некорректно',
          });
        }
        if (!autoTypeId || !autoBrandId) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать вид и марку',
          });
        }

        let autoModel = await AutoModel.findOne({
          where: {
            label,
            autoTypeId,
            autoBrandId,
          },
          transaction,
        });
        if (!!autoModel) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `Модель с таким названием уже существует`,
          });
        }

        const catalogSection = await CatalogSection.findOne({
          transaction,
        });

        autoModel = await AutoModel.create(
          {
            label,
            name_ru: name,
            status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
            isHidden: true,
            catalogSectionId: catalogSection.id,
            autoTypeId,
            autoBrandId,
          },
          {
            transaction,
          },
        );
        autoModel = transformEntityLocale(autoModel);

        return APIResponse({
          res,
          data: {
            autoModel,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Модель авто не добавлена',
          error: err,
        });
      }
    });
  };

  updateAutoModel = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.params.id;
        const name = req.body?.name?.trim();
        const label = generateLabel(name);
        const autoTypeId: string = req.body.autoTypeId;

        if (!name?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Название заполнено некорректно',
          });
        }
        if (!autoTypeId) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать вид',
          });
        }

        let autoModel = await AutoModel.findOne({
          where: {
            id,
          },
          transaction,
        });
        if (!autoModel) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Модель не найдена',
          });
        }

        const existingAutoModel = await AutoModel.findOne({
          where: {
            id: {
              [Op.ne]: id,
            },
            label,
            autoTypeId,
            autoBrandId: autoModel.autoBrandId,
          },
          transaction,
        });
        if (!!existingAutoModel) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Модель с таким названием уже существует',
          });
        }

        autoModel = await autoModel.update(
          {
            label,
            name_ru: name,
            autoTypeId,
          },
          {
            transaction,
          },
        );
        autoModel = transformEntityLocale(autoModel);

        return APIResponse({
          res,
          data: {
            autoModel,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Модель авто не обновлена',
          error: err,
        });
      }
    });
  };

  deleteAutoModel = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.params.id;

        let autoModel = await AutoModel.findByPk(id, {
          transaction,
        });
        if (!autoModel) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Модель не найдена',
          });
        }
        const productRelation = await ProductAutoModelRelations.findOne({
          where: {
            autoModelId: autoModel.id,
          },
          transaction,
        });
        if (!!productRelation) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `Нельзя удалить модель с товарами`,
          });
        }

        await AutoModel.destroy({
          force: true,
          where: {
            id,
          },
          transaction,
        });
        autoModel = transformEntityLocale(autoModel);

        return APIResponse({
          res,
          data: {
            autoModel,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Марка авто не удалена',
          error: err,
        });
      }
    });
  };

  getProductGroupList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      let { parent, catalog, nestingLevel, autoType, autoBrand } = query;
      const include = (req.query?.include || []) as string[];
      const search = (query?.search || '') as string;
      const showHidden = !!req.query?.showHidden;
      const mode = req.query?.mode as 'saleEdit' | 'sale';
      let autoTypesKey = 'activeAutoTypeIds';
      let autoBrandsKey = 'activeAutoBrandIds';

      const options: seq.FindAndCountOptions = {
        order: [
          ['order', 'ASC'],
          ['name_ru', 'ASC'],
        ],
        include: [],
      };
      options.where = {
        [Op.and]: [],
      };

      if (mode === 'saleEdit' && (!parent || parent === 'none')) {
        const { authUser, error } = await getAuthUser(req);
        if (!error && !!authUser) {
          const authUserRole = getCurrentRole(req, authUser);
          if (authUserRole.role.label === 'seller') {
            const sellerGroups = await SellerProductGroups.findAll({
              where: {
                userId: authUser.id,
              },
            });
            const groupIds = _.uniq(sellerGroups.map(item => item.productGroupId));
            options.where[Op.and].push({ id: groupIds });
          }
        }
      }
      if (mode === 'sale') {
        options.where[Op.and].push({
          forSale: true,
        });
        autoTypesKey = 'saleAutoTypeIds';
        autoBrandsKey = 'saleAutoBrandIds';
      }

      if (!showHidden) {
        options.where[Op.and].push({
          isHidden: false,
          status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
        });
      }

      if (!!search?.length) {
        options.where[Op.and].push({
          name_ru: {
            [Op.iLike]: `%${search}%`,
          },
        });
      }

      if (typeof parent !== 'undefined') {
        if (parent === 'none') {
          options.where[Op.and].push({
            parentId: null,
          });
        } else {
          options.include.push({
            model: ProductGroup,
            as: 'parent',
            required: true,
            where: {
              [Op.or]: [{ id: parent }, { label: parent }],
            },
          });
        }
      }

      if (typeof catalog !== 'undefined') {
        options.where[Op.and].push({
          catalog,
        });
      }

      if (typeof nestingLevel !== 'undefined') {
        options.where[Op.and].push({
          nestingLevel,
        });
      }

      autoType = [].concat(autoType).filter(value => !!value && value !== 'undefined');
      const autoTypesRequired = autoType.length > 0;
      if (autoTypesRequired || include.includes('autoTypes')) {
        options.include.push({
          model: AutoType,
          as: 'autoTypes',
          required: autoTypesRequired,
          where: autoTypesRequired && {
            [Op.or]: [{ id: autoType }, { label: autoType }],
          },
        });
      }
      if (autoTypesRequired && !showHidden) {
        const autoTypeEntities = await AutoType.findAll({
          where: {
            [Op.or]: [{ id: autoType }, { label: autoType }],
          },
        });
        options.where[Op.and].push({
          [Op.or]: autoTypeEntities.map(autoTypeEntity => ({
            [autoTypesKey]: {
              [Op.substring]: autoTypeEntity.id,
            },
          })),
        });
      }

      autoBrand = [].concat(autoBrand).filter(value => !!value && value !== 'undefined');
      const autoBrandsRequired = autoBrand.length > 0;
      if (autoBrandsRequired || include.includes('autoBrands')) {
        if (autoBrand.length > 0) {
          options.include.push({
            model: AutoBrand,
            as: 'autoBrands',
            required: autoBrandsRequired,
            where: autoBrandsRequired && {
              [Op.or]: [{ id: autoBrand }, { label: autoBrand }],
            },
          });
        }
      }
      if (autoBrandsRequired && !showHidden) {
        const autoBrandEntities = await AutoBrand.findAll({
          where: {
            [Op.or]: [{ id: autoBrand }, { label: autoBrand }],
          },
        });
        options.where[Op.and].push({
          [Op.or]: autoBrandEntities.map(autoBrandEntity => ({
            [autoBrandsKey]: {
              [Op.substring]: autoBrandEntity.id,
            },
          })),
        });
      }

      const groups = await ProductGroup.findAndCountAll(options);
      groups.rows = _.orderBy(
        groups.rows.map(item => transformEntityLocale(item)),
        ['order', 'name'],
        'asc',
      );

      return APIResponse({
        res,
        data: groups,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Категории товаров не загружены',
        error: err,
      });
    }
  };

  getProductGroup = async (req: Request, res: Response) => {
    try {
      const id = req.params.id;

      let productGroup = await ProductGroup.findByPk(id);
      if (!productGroup) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Категория не найдена',
        });
      }

      productGroup = transformEntityLocale(productGroup);

      return APIResponse({
        res,
        data: {
          productGroup,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Категория не загружена',
      });
    }
  };

  createProductGroup = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const name = req.body?.name?.trim();
        const label = generateLabel(name);
        const isSideGroup: boolean = req.body?.isSideGroup;
        const parentId: string = req.body?.parentId;

        if (!name?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Название заполнено некорректно',
          });
        }
        if (typeof isSideGroup === 'undefined') {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать тип категории',
          });
        }

        const where: seq.WhereOptions = {
          label,
        };
        if (!parentId) {
          where.parentId = null;
          where.nestingLevel = 0;
        } else {
          where.parentId = parentId;
          where.nestingLevel = 1;
        }
        let productGroup = await ProductGroup.findOne({
          where,
          transaction,
        });
        if (!!productGroup) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Категория с таким названием уже существует',
          });
        }

        const catalogSection = await CatalogSection.findOne({
          transaction,
        });

        productGroup = await ProductGroup.create(
          {
            label,
            name_ru: name,
            status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
            isHidden: true,
            nestingLevel: !parentId ? 0 : 1,
            parentId,
            catalogSectionId: catalogSection.id,
            catalog: !isSideGroup ? 'AUTO_PARTS' : 'AUTO_PRODUCTS',
          },
          {
            transaction,
          },
        );
        productGroup = transformEntityLocale(productGroup);

        return APIResponse({
          res,
          data: {
            productGroup,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Категория не добавлена',
          error: err,
        });
      }
    });
  };

  updateProductGroup = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.params.id;
        const name = req.body?.name?.trim();
        const label = generateLabel(name);
        const isSideGroup = req.body?.isSideGroup;

        if (!name?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Название заполнено некорректно',
          });
        }
        if (typeof isSideGroup === 'undefined') {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать тип категории',
          });
        }

        let productGroup = await ProductGroup.findOne({
          where: {
            id,
          },
          transaction,
        });
        if (!productGroup) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Категория не найдена',
          });
        }

        const existingProductGroup = await ProductGroup.findOne({
          where: {
            id: {
              [Op.ne]: id,
            },
            label,
            parentId: null,
            nestingLevel: 0,
          },
          transaction,
        });
        if (!!existingProductGroup) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Категория с таким названием уже существует',
          });
        }

        productGroup = await productGroup.update(
          {
            label,
            name_ru: name,
            catalog: !isSideGroup ? 'AUTO_PARTS' : 'AUTO_PRODUCTS',
          },
          {
            transaction,
          },
        );
        productGroup = transformEntityLocale(productGroup);

        return APIResponse({
          res,
          data: {
            productGroup,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Категория авто не обновлена',
          error: err,
        });
      }
    });
  };

  deleteProductGroup = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.params.id;

        let productGroup = await ProductGroup.findByPk(id, {
          transaction,
        });
        if (!productGroup) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Категория не найдена',
          });
        }
        const productRelation = await ProductGroupRelations.findOne({
          where: {
            productGroupId: productGroup.id,
          },
          transaction,
        });
        if (!!productRelation) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `Нельзя удалить категорию с товарами`,
          });
        }

        if (!productGroup.parentId) {
          await ProductGroup.destroy({
            force: true,
            where: {
              parentId: productGroup.id,
            },
            transaction,
          });
        }
        await ProductGroup.destroy({
          force: true,
          where: {
            id,
          },
          transaction,
        });
        productGroup = transformEntityLocale(productGroup);

        return APIResponse({
          res,
          data: {
            productGroup,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Категория не удалена',
          error: err,
        });
      }
    });
  };
}

export default ProductCategoriesCtrl;
