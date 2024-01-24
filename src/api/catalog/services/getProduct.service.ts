import httpStatus from 'http-status';
import seq from 'sequelize';
import FileModel from '../../files/models/File.model';
import Product from '../models/Product.model';
import ProductFile from '../models/ProductFile.model';
import AutoType from '../models/AutoType.model';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import ProductGroup from '../models/ProductGroup.model';
import { transformEntityLocale } from '../../../utils/common.utils';
import ProductAnalogs from '../models/ProductAnalogs.model';
import ProductApplicability from '../models/ProductApplicability.model';
import _ from 'lodash';
import ProductBranch from '../models/ProductBranch.model';
import { PUBLIC_PRODUCT_CATEGORY_STATUSES } from '../data';
import { IProduct } from '../interfaces';
import { ServiceError } from '../../../core/utils/serviceError';
import User from '../../user/models/User.model';
import UserReview from '../../user/models/UserReview.model';

export type IGetProductIncludeItem =
  | 'allCategories'
  | 'autoTypes'
  | 'autoBrands'
  | 'autoModels'
  | 'groups'
  | 'branches'
  | 'categoriesView'
  | 'applicabilities'
  | 'analogs'
  | 'files'
  | 'user';

interface IProps {
  id: string;
  include?: IGetProductIncludeItem[];
}

export const getProductService = async ({ id, include }: IProps): Promise<Product> => {
  try {
    const options: seq.FindOptions = {
      include: [],
      attributes: {
        exclude: ['originalTree'],
      },
    };

    if (include?.includes('files')) {
      options.include.push({
        model: ProductFile,
        as: 'productFiles',
        include: [{ model: FileModel, as: 'file' }],
      });
    }

    let product = (await Product.findByPk(id as string, options)) as IProduct;
    if (!product) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Товар не найден' });

    let branches: ProductBranch[] = [];

    product = transformEntityLocale(product);
    product.name = product?.pureName || product?.name;

    if (include?.includes('user') && !!product?.userId) {
      const user = await User.findByPk(product.userId);
      if (!!user) {
        const reviews = await UserReview.findAll({ where: { receiverId: user.id }, attributes: ['id', 'receiverId'] });
        product.user = {
          ...user.toJSON(),
          reviewsNumber: reviews.length,
        } as User;
      } else {
        product.user = null;
      }
    }

    if (include?.includes('autoTypes') || include?.includes('allCategories')) {
      const autoTypeIds: string[] = JSON.parse(product.autoTypeIds);
      const autoTypes = await AutoType.findAll({
        where: {
          id: autoTypeIds,
        },
      });
      product.autoTypes = autoTypes.map(item => ({
        ...transformEntityLocale(item),
      }));
    }
    if (include?.includes('autoBrands') || include?.includes('allCategories')) {
      const autoBrandIds: string[] = JSON.parse(product.autoBrandIds);
      const autoBrands = await AutoBrand.findAll({
        where: {
          id: autoBrandIds,
        },
        include: [
          {
            model: AutoType,
            as: 'autoTypes',
            required: false,
          },
        ],
      });
      product.autoBrands = autoBrands.map(item => ({
        ...transformEntityLocale(item),
      }));
    }
    if (include?.includes('autoModels') || include?.includes('allCategories')) {
      const autoModelIds: string[] = JSON.parse(product.autoModelIds);
      const autoModels = await AutoModel.findAll({
        where: {
          id: autoModelIds,
        },
        include: [{ model: AutoBrand, as: 'autoBrand', required: false }],
      });
      product.autoModels = autoModels.map(item => ({
        ...transformEntityLocale(item),
      }));
    }
    if (include?.includes('groups') || include?.includes('allCategories')) {
      const productGroupIds = (JSON.parse(product.groupIds) as string[]).concat(
        JSON.parse(product.subgroupIds) as string[],
      );
      const productGroups = await ProductGroup.findAll({
        where: {
          id: productGroupIds,
        },
        include: [
          { model: AutoType, as: 'autoTypes', required: false },
          { model: AutoBrand, as: 'autoBrands', required: false },
          { model: ProductGroup, as: 'parent', required: false },
        ],
      });
      product.groups = productGroups
        .filter(({ parentId }) => !parentId)
        .map(item => ({
          ...transformEntityLocale(item),
        }));
      product.subgroups = productGroups
        .filter(({ parentId }) => !!parentId)
        .map(item => ({
          ...transformEntityLocale(item),
        }));
    }

    if (include?.includes('branches')) {
      branches = (
        await ProductBranch.findAll({
          where: {
            productId: product.id,
          },
          order: [['createdAt', 'ASC']],
        })
      ).map(el => el.toJSON() as ProductBranch);
      for (const branch of branches) {
        if (!!branch?.autoModelIds) {
          branch.autoModelIds = JSON.parse(branch.autoModelIds);
        }
        if (!!branch?.autoModelIds) {
          const autoModelIds = (branch as any)?.autoModelIds as string[];
          if (!!autoModelIds?.length) {
            (branch as any).autoModels = (
              await AutoModel.findAll({
                where: {
                  id: autoModelIds,
                  status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
                },
              })
            ).map(el => transformEntityLocale(el) as AutoModel);
          }
        }
        if (!!branch?.groupId) {
          const sameBranch = branches.find(el => el?.groupId === branch?.groupId);
          if (!!(sameBranch as any)?.subgroups?.length) {
            (branch as any).subgroups = (sameBranch as any)?.subgroups;
          } else {
            (branch as any).subgroups = (
              await ProductGroup.findAll({
                where: {
                  nestingLevel: 1,
                  parentId: branch?.groupId,
                  status: PUBLIC_PRODUCT_CATEGORY_STATUSES,
                },
              })
            ).map(el => transformEntityLocale(el) as ProductGroup);
          }
        }
      }
      if (!!branches?.length && !branches?.find(el => el.isMain)) {
        branches[0].isMain = true;
      }
      product.branches = branches;
    }

    if (include?.includes('categoriesView')) {
      let mainBranch = branches.find(el => el.isMain);
      if (!mainBranch)
        mainBranch = await ProductBranch.findOne({
          where: {
            productId: product.id,
            isMain: true,
          },
        });
      if (!mainBranch)
        mainBranch = await ProductBranch.findOne({
          where: {
            productId: product.id,
          },
          order: [['createdAt', 'ASC']],
        });

      if (!!mainBranch) {
        product.categories = {
          autoType: null,
          autoBrand: null,
          autoModels: [],
          group: null,
          subgroup: null,
        };

        if (!!mainBranch?.autoTypeId) {
          const autoType = await AutoType.findByPk(mainBranch.autoTypeId, { attributes: ['id', 'label', 'name_ru'] });
          if (!!autoType) product.categories.autoType = transformEntityLocale(autoType);
        }

        if (!!mainBranch?.autoBrandId) {
          const autoBrand = await AutoBrand.findByPk(mainBranch.autoBrandId, {
            attributes: ['id', 'label', 'name_ru'],
          });
          if (!!autoBrand && !autoBrand?.isHidden) product.categories.autoBrand = transformEntityLocale(autoBrand);
        }

        const autoModelIds: string[] = JSON.parse(mainBranch?.autoModelIds || '[]');
        if (!!autoModelIds?.length) {
          product.categories.autoModels = (
            await AutoModel.findAll({
              where: {
                id: autoModelIds,
                isHidden: false,
              },
              attributes: ['id', 'label', 'name_ru'],
            })
          ).map(el => transformEntityLocale(el));
        }

        if (!!mainBranch?.groupId) {
          const group = await ProductGroup.findByPk(mainBranch.groupId, { attributes: ['id', 'label', 'name_ru'] });
          if (!!group && !group?.isHidden) product.categories.group = transformEntityLocale(group);
        }

        if (!!mainBranch?.subgroupId) {
          const subgroup = await ProductGroup.findByPk(mainBranch.subgroupId, {
            attributes: ['id', 'label', 'name_ru'],
          });
          if (!!subgroup && !subgroup?.isHidden) product.categories.subgroup = transformEntityLocale(subgroup);
        }
      }
    }

    if (include?.includes('applicabilities')) {
      const applicabilities = await ProductApplicability.findAll({
        order: [['createdAt', 'ASC']],
        where: {
          productId: product.id,
        },
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
        limit: 50, // TODO: pagination
      });
      product.applicabilities = applicabilities.map(item => ({
        ...transformEntityLocale(item),
        autoType: transformEntityLocale(item?.autoType),
        autoBrand: transformEntityLocale(item?.autoBrand),
        autoModel: transformEntityLocale(item?.autoModel),
      }));
    }
    if (include?.includes('analogs')) {
      const analogs = await ProductAnalogs.findAll({
        order: [['createdAt', 'ASC']],
        where: {
          productId: product.id,
        },
        limit: 50, // TODO: pagination
      });
      const analogProducts = await Product.findAll({
        where: {
          id: analogs.map(item => item.analogId),
        },
        order: [['createdAt', 'ASC']],
        limit: 50, // TODO: pagination
      });
      product.analogs = analogProducts.map(item => transformEntityLocale(item));
    }

    return product;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке товара',
      error: err,
    });
  }
};
