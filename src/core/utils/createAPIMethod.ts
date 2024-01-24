import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import User from '../../api/user/models/User.model';
import UserRoles from '../../api/role/models/UserRoles.model';
import mainDBConnection from '../../config/db';
import { APIError, APIResponse } from '../../utils/api.utils';

/**
 * Required for creating all HTTP controllers methods. Put all method's code in the callback function body
 * @param params
 * @param callback Method's body. Must return data that will be sent in the response
 */
export const createAPIMethod =
  (
    params: {
      /**
       * Message to send in a response in case of unexpected error
       */
      errorMessage: string;
      /**
       * Whether to run transaction or not. In most cases set to true in methods containing DB update operations
       */
      runTransaction: boolean;
      /**
       * Custom error response status to use instead of default 500 (INTERNAL_SERVER_ERROR) status
       */
      errorStatus?: number;
    },
    callback: (props: {
      req: Request;
      res: Response;
      authUser: User;
      authUserRole: UserRoles;
      transaction: Transaction | null;
    }) => any,
  ) =>
  async (req: Request, res: Response) => {
    const { errorMessage, runTransaction, errorStatus } = params;
    const authUser: User = (req as any)?.auth?.user || null;
    const authUserRole: UserRoles = (req as any)?.auth?.currentRole || null;

    // Delete authenticated user's before method's execution
    if ((req as any)?.auth) delete (req as any)?.auth;

    const throwError = (err: Error) => {
      return APIError({
        res,
        status: errorStatus || httpStatus.INTERNAL_SERVER_ERROR,
        message: errorMessage,
        error: err,
      });
    };

    if (runTransaction) {
      return mainDBConnection.transaction(
        { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
        async transaction => {
          try {
            const resData = await callback({ req, res, transaction, authUser, authUserRole });
            return APIResponse({ res, data: resData });
          } catch (err) {
            await transaction.rollback();
            throwError(err);
          }
        },
      );
    } else {
      try {
        const resData = await callback({ req, res, authUser, authUserRole, transaction: null });
        return APIResponse({ res, data: resData });
      } catch (err) {
        throwError(err);
      }
    }
  };
