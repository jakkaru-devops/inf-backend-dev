import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';
import { formatPhoneNumber } from '../../../utils/common.utils';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import authService from '../services';
import { BaseController } from '../../../core/classes/base.controller';
import { SocketServer } from '../../../core/socket';
import { isManager } from '../../user/utils';

export class AuthController extends BaseController {
  io: SocketServer;

  /**
   * @desc      Login
   * @route     POST /auth/login
   * @body 			{ phone: string, role?: IUserRoleOption, confirmCode?: string }
   * @success 	{ success: boolean } || { payload: LoginResponse, user: User }
   * @access    Private
   */
  login = createAPIMethod(
    { errorMessage: 'Авторизация не удалась', runTransaction: true },
    async ({ req, transaction }) => {
      const phone = formatPhoneNumber(req.body.phone);
      const { confirmCode, role, platform, orderRequest, testAccessKey, googleReCaptchaSiteKey, googleReCaptchaToken } =
        req.body;
      const ip = req.ip;

      return await authService.login(
        {
          phone,
          confirmCode,
          role,
          platform,
          orderRequest,
          testAccessKey,
          googleReCaptchaSiteKey,
          googleReCaptchaToken,
          ip,
        },
        { io: this.io, transaction },
      );
    },
  );

  /**
   * @desc Receiving a token for the seller's or customer's ID for authorization under his account
   * @route GET /auth/manager-login
   * @success { payload: string, role?: IUserRoleOption }
   */
  getUserToken = createAPIMethod(
    { errorMessage: 'Ошибка при получении доступа', runTransaction: false },
    async ({ req, res, authUserRole }) => {
      const { id, roleLabel } = req.query as any;

      if (!isManager(authUserRole)) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Недостаточно прав',
        });
      }

      return await authService.getUserToken({ userId: id, roleLabel });
    },
  );
}
