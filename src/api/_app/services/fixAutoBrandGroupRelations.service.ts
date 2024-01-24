import e, { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import formatDistance from 'date-fns/formatDistance';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import AutoType from '../../catalog/models/AutoType.model';
import Product from '../../catalog/models/Product.model';
import { FIXED_CATEGORIES_BY_AUTO_TYPES } from '../data/fixCategoriesByAutoTypes';
import { FIXED_PRODUCT_GROUPS } from '../data/fixCategories';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import ProductGroupRelations from '../../catalog/models/relations/ProductGroupRelations.model';
import AutoTypeGroupRelations from '../../catalog/models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../../catalog/models/relations/AutoBrandGroupRelations.model';

export const fixAutoBrandGroupRelationsService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const startTime = new Date().getTime();

    const allAutoTypes = await AutoType.findAll();
    const allAutoBrands = await AutoBrand.findAll({
      include: [
        {
          model: AutoType,
          as: 'autoTypes',
        },
      ],
    });
    let allProductGroups = await ProductGroup.findAll({
      where: {
        nestingLevel: [0, 1],
      },
    });
    let counter = FIXED_PRODUCT_GROUPS.length;
    console.log(`COMMON CATEGORIES COUNT - ${counter}`);

    /* async function handleGroups(
      groups: {
        from: ProductGroup[];
        to: ProductGroup[];
      },
      product: Product,
    ) {
      if (!!groups.from.length && !groups?.to?.length) {
        // delete relation to group
        await ProductGroupRelations.destroy({
          force: true,
          where: {
            productId: product.id,
            productGroupId: groups.from[0].id,
          },
        });
        if (groups.from.length > 1) {
          // delete relation to subgroup
          await ProductGroupRelations.destroy({
            force: true,
            where: {
              productId: product.id,
              productGroupId: groups.from[1].id,
            },
          });
        } else {
        }
      } else if (groups.from.length > 1 && groups?.to?.length > 1) {
        if (groups.from[0].id !== groups.to[0].id) {
          // delete relation to group
          await ProductGroupRelations.destroy({
            force: true,
            where: {
              productId: product.id,
              productGroupId: groups.from[0].id,
            },
          });
          // create relation to new group
          await ProductGroupRelations.findOrCreate({
            where: {
              productId: product.id,
              productGroupId: groups.to[0].id,
            },
            defaults: {
              productId: product.id,
              productGroupId: groups.to[0].id,
            },
          });
        }
        // delete relation to subgroup
        await ProductGroupRelations.destroy({
          force: true,
          where: {
            productId: product.id,
            productGroupId: groups.from[1].id,
          },
        });
        // create relation to new subgroup
        await ProductGroupRelations.findOrCreate({
          where: {
            productId: product.id,
            productGroupId: groups.to[1].id,
          },
          defaults: {
            productId: product.id,
            productGroupId: groups.to[1].id,
          },
        });
      } else if (groups.from.length === 1 && groups?.to?.length === 1) {
        // delete relation to group
        await ProductGroupRelations.destroy({
          force: true,
          where: {
            productId: product.id,
            productGroupId: groups.from[0].id,
          },
        });
        // create relation to new group
        await ProductGroupRelations.findOrCreate({
          where: {
            productId: product.id,
            productGroupId: groups.to[0].id,
          },
          defaults: {
            productId: product.id,
            productGroupId: groups.to[0].id,
          },
        });

        const subgroupEntities = await ProductGroup.findAll({
          where: {
            nestingLevel: 1,
            parentId: groups.from[0].id,
          },
        });
        // delete relation to subgroup
        await ProductGroupRelations.destroy({
          force: true,
          where: {
            productId: product.id,
            productGroupId: subgroupEntities.map(el => el.id),
          },
        });
        // update subgroups parentId
        await ProductGroup.update(
          {
            parentId: groups.to[0].id,
          },
          {
            where: {
              nestingLevel: 1,
              parentId: groups.from[0].id,
            },
          },
        );
      } else if (groups.from.length === 1 && groups?.to?.length > 1) {
        // delete relation to group
        await ProductGroupRelations.destroy({
          force: true,
          where: {
            productId: product.id,
            productGroupId: groups.from[0].id,
          },
        });
        // create relation to new group
        await ProductGroupRelations.findOrCreate({
          where: {
            productId: product.id,
            productGroupId: groups.to[0].id,
          },
          defaults: {
            productId: product.id,
            productGroupId: groups.to[0].id,
          },
        });
      } else if (groups.from.length > 1 && groups?.to?.length === 1) {
        // delete relation to group
        await ProductGroupRelations.destroy({
          force: true,
          where: {
            productId: product.id,
            productGroupId: groups.from[0].id,
          },
        });
        // create relation to new group
        await ProductGroupRelations.findOrCreate({
          where: {
            productId: product.id,
            productGroupId: groups.to[0].id,
          },
          defaults: {
            productId: product.id,
            productGroupId: groups.to[0].id,
          },
        });
        // update subgroup parentId
        await groups.from[1].update({
          parentId: groups.to[0].id,
        });
      }
    }

    for (const PRODUCT_GROUP of FIXED_PRODUCT_GROUPS) {
      const groups = {
        from: [
          allProductGroups.find(entity => entity.nestingLevel === 0 && entity.label === PRODUCT_GROUP.from[0]),
          PRODUCT_GROUP.from.length > 1 &&
            allProductGroups.find(entity => entity.nestingLevel === 1 && entity.label === PRODUCT_GROUP.from[1]),
        ].filter(Boolean),
        to: !!PRODUCT_GROUP?.to?.length
          ? [
              allProductGroups.find(entity => entity.nestingLevel === 0 && entity.label === PRODUCT_GROUP.to[0]),
              PRODUCT_GROUP?.to?.length > 1 &&
                allProductGroups.find(entity => entity.nestingLevel === 1 && entity.label === PRODUCT_GROUP.to[1]),
            ].filter(Boolean)
          : [],
      };

      const productsOptions: seq.FindOptions = {
        include: [
          {
            model: ProductGroup,
            as: 'groups',
            required: true,
            where: {
              id: groups.from[0].id,
            },
          },
        ],
      };
      if (groups.from.length > 1) {
        productsOptions.include.push({
          model: ProductGroup,
          as: 'subgroups',
          required: true,
          where: {
            id: groups.from[1].id,
          },
        });
      }
      const products = await Product.findAll(productsOptions);

      for (const product of products) {
        console.log('PRODUCT -', product.id);
        await handleGroups(groups, product);
      }

      counter--;
      console.log(`${counter} groups remain. Current - ${JSON.stringify(PRODUCT_GROUP)}`);
    }

    counter = FIXED_CATEGORIES_BY_AUTO_TYPES.flatMap(el => el.autoBrands).flatMap(el => el.groups).length;
    console.log(`BRANDS CATEGORIES COUNT - ${counter}`);

    for (const AUTO_TYPE of FIXED_CATEGORIES_BY_AUTO_TYPES) {
      console.log('AUTO TYPE -', AUTO_TYPE.label);
      const autoTypeEntity = allAutoTypes.find(el => el.label === AUTO_TYPE.label);
      for (const AUTO_BRAND of AUTO_TYPE.autoBrands) {
        console.log('AUTO BRAND -', AUTO_BRAND.labels);
        const autoBrandEntities = allAutoBrands.filter(entity => AUTO_BRAND.labels.includes(entity.label));
        if (!autoBrandEntities.length) continue;

        for (const PRODUCT_GROUP of AUTO_BRAND.groups) {
          const groups = {
            from: [
              allProductGroups.find(entity => entity.nestingLevel === 0 && entity.label === PRODUCT_GROUP.from[0]),
              PRODUCT_GROUP.from.length > 1 &&
                allProductGroups.find(entity => entity.nestingLevel === 1 && entity.label === PRODUCT_GROUP.from[1]),
            ].filter(Boolean),
            to: !!PRODUCT_GROUP?.to?.length
              ? [
                  allProductGroups.find(entity => entity.nestingLevel === 0 && entity.label === PRODUCT_GROUP.to[0]),
                  PRODUCT_GROUP?.to?.length > 1 &&
                    allProductGroups.find(entity => entity.nestingLevel === 1 && entity.label === PRODUCT_GROUP.to[1]),
                ].filter(Boolean)
              : [],
          };

          const productsOptions: seq.FindOptions = {
            include: [
              {
                model: AutoType,
                as: 'autoTypes',
                required: true,
                where: {
                  id: autoTypeEntity.id,
                },
              },
              {
                model: AutoBrand,
                as: 'autoBrands',
                required: true,
                where: {
                  id: autoBrandEntities.map(el => el.id),
                },
              },
              {
                model: ProductGroup,
                as: 'groups',
                required: true,
                where: {
                  id: groups.from[0].id,
                },
              },
            ],
          };

          if (groups.from.length > 1) {
            productsOptions.include.push({
              model: ProductGroup,
              as: 'subgroups',
              required: true,
              where: {
                id: groups.from[1].id,
              },
            });
          }
          const products = await Product.findAll(productsOptions);

          for (const product of products) {
            console.log('PRODUCT -', product.id);
            await handleGroups(groups, product);
          }

          counter--;
          console.log(`${counter} groups remain. Current - ${JSON.stringify(PRODUCT_GROUP)}`);
        }
      }
    }

    allProductGroups = await ProductGroup.findAll({
      where: {
        nestingLevel: [0, 1],
      },
    });

    for (const groupEntity of allProductGroups) {
      const relation = await ProductGroupRelations.findOne({
        where: {
          productGroupId: groupEntity.id,
        },
      });
      if (!!relation) continue;

      await ProductGroup.destroy({
        where: {
          nestingLevel: 1,
          parentId: groupEntity.id,
        },
        force: true,
      });
      await groupEntity.destroy({
        force: true,
      });
    } */

    const productGroups = await ProductGroup.findAll({
      where: {
        catalog: {
          [Op.ne]: 'AUTO_PARTS',
        },
      },
    });
    await AutoTypeGroupRelations.destroy({
      force: true,
      where: {
        productGroupId: productGroups.map(el => el.id),
      },
    });
    await AutoBrandGroupRelations.destroy({
      force: true,
      where: {
        productGroupId: productGroups.map(el => el.id),
      },
    });

    const endTime = new Date().getTime();

    console.log(`Products transfer took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Auto brand relations have been modified',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while auto brand relations modification',
      error: err,
    });
  }
};
