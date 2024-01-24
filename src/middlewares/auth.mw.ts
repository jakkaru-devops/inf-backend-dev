import { Request, Response, NextFunction } from 'express';
import { APIError } from './../utils/api.utils';
import { getCurrentRole, getAuthUser, verifyPermissions } from '../utils/auth.utils';
import { IAuth } from '../api/auth/interfaces/auth.interfaces';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const { authUser, error } = await getAuthUser(req);

  if (error) {
    throw APIError({
      res,
      ...error,
    });
  }

  const authData: IAuth = {
    user: authUser,
    currentRole: getCurrentRole(req, authUser),
  };

  req.body.authUser = authData.user;
  req.body.authUserRole = authData.currentRole;

  req['auth'] = authData;

  next();
};

export const requirePermissions = (requiredPermissions: string | string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { authUser, error } = await getAuthUser(req);

    if (error) {
      throw APIError({
        res,
        ...error,
      });
    }

    const authData: IAuth = {
      user: authUser,
      currentRole: getCurrentRole(req, authUser),
    };

    req.body.authUser = authData.user;
    req.body.authUserRole = authData.currentRole;

    req['auth'] = authData;

    const { error: verifyPermissionsError } = verifyPermissions(requiredPermissions, { req });
    if (verifyPermissionsError) {
      throw APIError({
        res,
        ...verifyPermissionsError,
      });
    }

    next();
  };
};
