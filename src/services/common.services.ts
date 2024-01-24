import { Transaction } from 'sequelize';
import { Model } from 'sequelize-typescript';

interface ISyncEntitiesProps {
  entities: Model[];
  model: any;
  items: any[];
  byKey?: string;
  transaction: Transaction;
}

/**
 * Create new entities from `items` that are not listed in `entities`.
 * Restore (if needed) and Update `entities` listed in `items`.
 * Delete `entities` not listed in `items`
 * @param entities
 * @param items
 * @param params
 */
export const syncEntities = async ({ entities, model, items, byKey = 'id', transaction }: ISyncEntitiesProps) => {
  const resultEntities: Model<any>[] = [];

  for (const item of items) {
    const entity = entities.find(el => el[byKey] === item[byKey]);

    if (!!entity) {
      resultEntities.push(await entity.update({ ...item, deletedAt: null }, { transaction }));
    } else {
      resultEntities.push(
        await model.create(item, {
          transaction,
        }),
      );
    }
  }

  for (const entity of entities) {
    if (!!items.find(item => item[byKey] === entity.id) && !entity.deletedAt) continue;

    await entity.destroy({
      transaction,
    });
  }

  return resultEntities;
};
