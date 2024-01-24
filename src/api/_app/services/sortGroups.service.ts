import { Transaction } from 'sequelize';
import AutoType from '../../catalog/models/AutoType.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import { Op } from 'sequelize';
import _ from 'lodash';
import AutoTypeGroupRelations from '../../catalog/models/relations/AutoTypeGroupRelations.model';
import AutoBrandGroupRelations from '../../catalog/models/relations/AutoBrandGroupRelations.model';
import Product from '../../catalog/models/Product.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import { PRODUCT_STATUSES, PUBLIC_PRODUCT_STATUSES } from '../../catalog/data';
import { getBranchesCategoriesJson } from '../../catalog/utils';

export const sortGroupsAppService = async ({ transaction }: { transaction: Transaction }) => {
  // Update auto types order
  const autoTypesOrder = [
    'gruzovye',
    'spectehnika',
    'dvigateli',
    'avtobusy',
    'pritsepy',
    'kommercheskii',
    'legkovye',
    'mototsikly',
  ];
  for (let i = 0; i < autoTypesOrder.length; i++) {
    await AutoType.update(
      { order: i + 1 },
      {
        where: {
          label: autoTypesOrder[i],
        },
        transaction,
      },
    );
  }

  // Set parents to groups
  const nestedGroups = [
    {
      parent: 'instrumenti',
      children: [
        'pnevmoinstrument',
        'rezhushchii_instrument_i_osnastka',
        'slesarnii_instrument',
        'stroitelnie_instrumenti_i_soputstvuyushchie_tovari',
        'shoferskoi_instrument',
        'elektro_i_benzo_instrument',
      ],
    },
  ];
  for (const item of nestedGroups) {
    const parentGroup = await ProductGroup.findOne({
      where: {
        label: item.parent,
        parentId: null,
        nestingLevel: 0,
      },
      transaction,
    });
    if (!parentGroup) continue;

    const childGroups = await ProductGroup.findAll({
      where: {
        label: { [Op.in]: item.children },
        parentId: null,
        nestingLevel: 0,
      },
      transaction,
    });
    const childGroupIds = childGroups.map(el => el.id);

    const parentAutoTypeIds = _.uniq(JSON.parse(parentGroup.activeAutoTypeIds) as string[]);
    const parentAutoBrandIds = _.uniq(JSON.parse(parentGroup.activeAutoBrandIds) as string[]);
    const childrenAutoTypeIds = _.uniq(childGroups.flatMap(el => JSON.parse(el.activeAutoTypeIds) as string[]));
    const childrenAutoBrandIds = _.uniq(childGroups.flatMap(el => JSON.parse(el.activeAutoBrandIds) as string[]));
    const resultParentAutoTypeIds = _.uniq([...parentAutoTypeIds, ...childrenAutoTypeIds]);
    const resultParentAutoBrandIds = _.uniq([...parentAutoBrandIds, ...childrenAutoBrandIds]);

    console.log('childGroupIds', childGroupIds);
    console.log('parentAutoTypeIds', parentAutoTypeIds);
    console.log('parentAutoBrandIds', parentAutoBrandIds);
    console.log('childrenAutoTypeIds', childrenAutoTypeIds);
    console.log('childrenAutoBrandIds', childrenAutoBrandIds);

    // Update parent group
    await parentGroup.update(
      {
        catalog: 'AUTO_PRODUCTS', // move parent group to side catalog
        activeAutoTypeIds: JSON.stringify(resultParentAutoTypeIds),
        activeAutoBrandIds: JSON.stringify(resultParentAutoBrandIds),
      },
      { transaction },
    );

    // Update parent relations to auto types and brands
    // No need to delete children relations
    for (const autoTypeId of resultParentAutoTypeIds) {
      await AutoTypeGroupRelations.findOrCreate({
        defaults: {
          autoTypeId,
          productGroupId: parentGroup.id,
        },
        where: {
          autoTypeId,
          productGroupId: parentGroup.id,
        },
        transaction,
      });
    }
    for (const autoBrandId of resultParentAutoBrandIds) {
      await AutoBrandGroupRelations.findOrCreate({
        defaults: {
          autoBrandId,
          productGroupId: parentGroup.id,
        },
        where: {
          autoBrandId,
          productGroupId: parentGroup.id,
        },
        transaction,
      });
    }

    // Update product branches
    const branches = await ProductBranch.findAll({
      where: {
        groupId: { [Op.in]: childGroupIds },
      },
      order: [['createdAt', 'ASC']],
      transaction,
    });
    let branchesCounter = branches.length;

    for (const branch of branches) {
      branchesCounter--;
      if (branchesCounter % 100 === 0) console.log(`${branchesCounter} branches left. Current ${branch.id}`);

      await branch.update(
        {
          groupId: parentGroup.id,
          subgroupId: branch.groupId,
        },
        { transaction },
      );
    }

    // Update products
    const branchesObj = _.groupBy(branches, 'productId');
    const branchesByProducts = Object.keys(branchesObj).map(productId => ({
      productId,
      entities: branchesObj[productId],
    }));
    const products = await Product.findAll({
      where: {
        id: { [Op.in]: branchesByProducts.map(item => item.productId) },
      },
      order: [['createdAt', 'ASC']],
      transaction,
    });
    let productsCounter = products.length;

    for (const product of products) {
      productsCounter--;
      if (productsCounter % 100 === 0) console.log(`${productsCounter} products left. Current ${product.id}`);

      const productBranches = await ProductBranch.findAll({
        where: {
          productId: product.id,
          status: PUBLIC_PRODUCT_STATUSES.concat(PRODUCT_STATUSES.SALE),
        },
        transaction,
      });
      const productGroupIds = JSON.parse(product.groupIds) as string[];
      const productSubgroupIds = JSON.parse(product.subgroupIds) as string[];
      const newSubgroupIds = childGroupIds.filter(subgroupId =>
        productBranches.some(el => el.subgroupId === subgroupId),
      );

      await product.update({
        groupIds: JSON.stringify(
          _.uniq(productGroupIds.filter(groupId => !childGroupIds.includes(groupId)).concat(parentGroup.id)),
        ),
        subgroupIds: JSON.stringify(_.uniq(productSubgroupIds.concat(newSubgroupIds))),
        branchCategoriesJson: JSON.stringify(getBranchesCategoriesJson(productBranches)),
      });
    }

    // Update described products
    const describedProducts = await DescribedProduct.findAll({
      transaction,
    });
    console.log('describedProducts', describedProducts.length);
    for (const describedProduct of describedProducts) {
      if (childGroupIds.includes(describedProduct.productGroupId)) {
        await describedProduct.update(
          {
            productGroupId: parentGroup.id,
          },
          { transaction },
        );
      }
      if (describedProduct.productGroupIds.some(groupId => childGroupIds.includes(groupId))) {
        await describedProduct.update(
          {
            productGroupIds: _.uniq(
              describedProduct.productGroupIds
                .filter(groupId => !childGroupIds.includes(groupId))
                .concat(parentGroup.id),
            ),
          },
          { transaction },
        );
      }
    }

    // Update SellerProductGroups
    const sellersGroups = await SellerProductGroups.findAll({
      where: {
        productGroupId: { [Op.in]: childGroupIds },
      },
      transaction,
    });
    const sellersGroupsObj = _.groupBy(sellersGroups, 'userId');
    const sellersGroupsByUsers = Object.keys(sellersGroupsObj).map(userId => ({
      userId,
      entities: sellersGroupsObj[userId],
    }));
    console.log('sellersGroups', sellersGroups.length);

    for (const item of sellersGroupsByUsers) {
      await SellerProductGroups.findOrCreate({
        defaults: {
          userId: item.userId,
          productGroupId: parentGroup.id,
        },
        where: {
          userId: item.userId,
          productGroupId: parentGroup.id,
        },
        transaction,
      });
      await SellerProductGroups.destroy({
        where: {
          userId: item.userId,
          productGroupId: { [Op.in]: item.entities.map(el => el.productGroupId) },
        },
        force: true,
        transaction,
      });
    }

    // Update children
    // TODO: update nesting levels
    for (const group of childGroups) {
      await group.update(
        {
          parentId: parentGroup.id,
          nestingLevel: 1,
        },
        { transaction },
      );

      const children = await ProductGroup.findAll({
        where: {
          parentId: group.id,
        },
        transaction,
      });
      for (const child of children) {
        await child.update(
          {
            nestingLevel: child.nestingLevel + 1,
          },
          { transaction },
        );

        const nestedChildren = await ProductGroup.findAll({
          where: {
            parentId: child.id,
          },
          transaction,
        });
        for (const nestedChild of nestedChildren) {
          await nestedChild.update(
            {
              nestingLevel: nestedChild.nestingLevel + 1,
            },
            { transaction },
          );
        }
      }
    }
  }

  // Update groups order
  const groupsOrder = [
    'podshipniki',
    'instrumenti',
    'avtokhimiya,_smazki,_prisadki',
    'akkumulyatori,_akb',
    'garazhnoe_oborudovanie',
    'filtri_(gruzovie,_spetstekhnika)',
    'filtri_(legkovie,_kommercheskie)',
    'gidrotsilindri',
    'diski_kolesnie_i_kolpaki',
    'nabori_avtomobilnie_i_prinadlezhnosti',
    'masla_i_tekhnicheskie_zhidkosti',
    'tsepi_protivoskolzheniya',
    'raskhodniki_i_komplektuyushchie',
    'shini_i_kameri',
  ];
  for (let i = 0; i < groupsOrder.length; i++) {
    await ProductGroup.update(
      { order: i + 1 },
      {
        where: {
          label: groupsOrder[i],
        },
        transaction,
      },
    );
  }
};
