import { Transaction } from 'sequelize';
import mainDBConnection from '../config/db';

export const executeTransaction = (
  callback: (t: Transaction) => PromiseLike<unknown>,
  params?: { autocommit?: boolean },
) => {
  if (!params) params = {};
  params.autocommit = typeof params?.autocommit !== 'undefined' ? params.autocommit : true;

  return mainDBConnection.transaction(
    {
      isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      autocommit: params.autocommit,
    },
    t => callback(t),
  );
};

export const executeTransactionPromise = () => {
  const result: Promise<Transaction> = new Promise(resolve => {
    return mainDBConnection.transaction(
      {
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
      },
      async t => {
        resolve(t);
      },
    );
  });
  return result;
};
