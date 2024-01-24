import { Request } from 'express';
import bcrypt from 'bcrypt';
import moment from 'moment';
import jwt from 'jsonwebtoken';
import httpStatus from 'http-status';

import {
  JWT_SECRET,
  BCRYPT_SECRET,
  NODEMAILER_PASSWORD,
  NODEMAILER_EMAIL,
  CLIENT_APP_URL,
  SMS_AUTHENTICATION_ENABLED,
  TEST_SMS_CONFIRMATION_CODE,
  TEST_ACCESS_KEY,
  REDIS_URL,
} from './../config/env';
import User from '../api/user/models/User.model';
import { LoginResponse, JwtPayload } from '../interfaces/auth.interfaces';
import { totp } from 'otplib';
import nodemailer from 'nodemailer';
import { callToPhone, sendSmsToPhone } from './common.utils';
import UserRoles from '../api/role/models/UserRoles.model';
import Role from '../api/role/models/Role.model';
import OrganizationSeller from '../api/organization/models/OrganizationSeller.model';
import SellerRegisterFile from '../api/files/models/SellerRegisterFile.model';
import Organization from '../api/organization/models/Organization.model';
import OrganizationRejection from '../api/organization/models/OrganizationRejection.model';
import OrganizationSellerRejection from '../api/organization/models/OrganizationSellerRejection.model';
import FavoriteProduct from '../api/catalog/models/FavoriteProduct.model';
import { IUserRoleOption } from '../api/role/interfaces';
import { IServiceResponse } from '../interfaces/common.interfaces';
import CartProduct from '../api/cart/models/CartProduct.model';
import Redis from 'ioredis';
import { Transaction } from 'sequelize';

totp.options = { digits: 4 };

export function getJwtSecret(): string {
  return JWT_SECRET;
}

function getBcryptSecret(): string {
  return BCRYPT_SECRET;
}

export function validatePassword(userPassword: string, hashedPassword: string): boolean {
  return bcrypt.compareSync(userPassword, hashedPassword);
}

export function generateHash(password: string): string {
  return bcrypt.hashSync(password, getBcryptSecret());
}

/**
 * @desc Compare user password & hashed password
 * @deprecated The method should not be used
 * @param confirmCode
 * @param hashedCode
 */
export function validateCode(confirmCode: string, hashedCode: string): boolean {
  return bcrypt.compareSync(confirmCode, hashedCode);
}

export function generatePayload(user: User): LoginResponse {
  const expires = moment().utc().add({ days: 7 }).unix();
  const payload: JwtPayload = {
    id: user.id,
    expires,
  };
  const token = jwt.sign(payload, getJwtSecret());

  return {
    token,
  };
}

export function getAuthUser(req: Request) {
  const result: Promise<{
    payload?: JwtPayload;
    authUser?: User;
    error?: {
      status: number;
      message: string;
      error?: any;
    };
  }> = new Promise(async resolve => {
    if (!req.headers.authorization) {
      return resolve({
        error: {
          status: httpStatus.UNAUTHORIZED,
          message: 'Authorization token is not provided',
          error: true,
        },
      });
    }

    const token = req.headers.authorization.split(' ')[1];
    if (!token) {
      return resolve({
        error: {
          status: httpStatus.UNAUTHORIZED,
          message: 'Authorization token type (Bearer, Basic, etc.) is not specified',
          error: true,
        },
      });
    }

    jwt.verify(token, JWT_SECRET, async (err: jwt.VerifyErrors, payload: JwtPayload) => {
      if (err) {
        return resolve({
          error: {
            status: httpStatus.UNAUTHORIZED,
            message: 'Invalid or expired authorization token',
            error: err,
          },
        });
      }

      const authUser = await User.findByPk(payload.id, {
        include: [
          {
            model: UserRoles,
            as: 'roles',
            include: [{ model: Role, as: 'role', required: false }],
            required: false,
          },
          {
            model: OrganizationSeller,
            as: 'sellers',
            limit: 1,
            required: false,
            include: [
              {
                model: OrganizationSellerRejection,
                as: 'rejections',
                required: false,
                order: [['createdAt', 'DESC']],
                limit: 1,
              },
              {
                model: Organization,
                as: 'organization',
                required: false,
              },
            ],
          },
          {
            model: SellerRegisterFile,
            as: 'sellerRegisterFiles',
            required: true,
            limit: 1,
          },
          {
            model: Organization,
            as: 'createdOrganizations',
            required: false,
            limit: 1,
            attributes: ['id'],
            include: [
              {
                model: OrganizationRejection,
                as: 'rejections',
                required: false,
                order: [['createdAt', 'DESC']],
                limit: 1,
              },
            ],
          },
          {
            model: FavoriteProduct,
            as: 'favoriteProducts',
            required: false,
            attributes: ['id', 'productId', 'acatProductId', 'priceOfferId'],
          },
          {
            model: CartProduct,
            as: 'cartProducts',
            required: false,
          },
        ],
      });
      if (!authUser) {
        return resolve({
          error: {
            status: httpStatus.UNAUTHORIZED,
            message: 'User not found',
            error: authUser,
          },
        });
      }

      return resolve({
        payload,
        authUser,
      });
    });
  });

  return result;
}

export const getCurrentRole = (req: Request, authUser: User) => {
  const roleHeader = req.headers['user-role'];
  const roleIndex = authUser.roles.findIndex(el => el.role.id === roleHeader);
  let authUserRole: UserRoles = roleIndex !== -1 ? authUser.roles[roleIndex] : null;
  if (!authUserRole) {
    const rolesPriority: IUserRoleOption[] = ['customer', 'seller', 'operator', 'manager', 'moderator', 'superadmin'];
    for (let i = 0; i < rolesPriority.length; i++) {
      if (authUser.roles[i].role) {
        authUserRole = authUser.roles[i];
        break;
      }
    }
  }

  return authUserRole;
};

export const verifyPermissions = (
  permissions: string | string[],
  { req, authUserRole }: { req?: Request; authUserRole?: UserRoles },
): IServiceResponse<boolean> => {
  if (req) {
    authUserRole = req.body.authUserRole;
  }
  if (!authUserRole || !authUserRole.role) {
    return {
      error: {
        status: httpStatus.FORBIDDEN,
        message: 'Недостаточно прав для выполнения операции',
      },
    };
  }

  if (
    authUserRole.requestsBannedUntil !== null &&
    authUserRole.requestsBannedUntil.getTime() > new Date().getTime() &&
    [permissions]
      .flat()
      .some(permission =>
        [
          'exploreAllOrderRequestsAvailable',
          'requestOrdersPlusHistoryAvailable',
          'manageOrderRequestsAvailable',
          'exploreOrderRequestsAndOrdersAvailable',
        ].includes(permission),
      )
  ) {
    return {
      error: {
        status: httpStatus.FORBIDDEN,
        message: 'Запросы заблокированы',
      },
    };
  }

  // Check if auth user has all required permissions
  if (![permissions].flat().some(permission => authUserRole.role[permission]))
    return {
      error: { status: httpStatus.FORBIDDEN, message: 'Недостаточно прав для выполнения операции' },
    };

  return {
    result: true,
  };
};

export const sendEmail = async (email: string, userId: string | number): Promise<void> => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: NODEMAILER_EMAIL,
      pass: NODEMAILER_PASSWORD,
    },
  });

  const token = totp.generate(`inf-email-${userId}`);

  const url = `${CLIENT_APP_URL || 'http://localhost:7777'}/confirm/${token}`;
  const html = `<p>Для верификации электронной почты пройдите по магической <a href='${url}'>ссылке</a></p>`;

  const message = {
    from: `INF <${process.env.EMAIL}>`,
    to: email,
    subject: 'INF Code',
    html,
  };

  await transporter.sendMail(message);
};

export const sendAuthCode = ({
  phone,
  userId,
  authMethod,
  testAccessKey,
  transaction,
}: {
  phone: string;
  userId: string;
  authMethod: 'call' | 'sms';
  testAccessKey?: string;
  transaction: Transaction;
}): Promise<boolean> =>
  new Promise(async (resolve, reject) => {
    try {
      const user = await User.findByPk(userId, {
        transaction,
      });
      if (!!user?.authCode) {
        return resolve(true);
      }

      if (SMS_AUTHENTICATION_ENABLED && testAccessKey !== TEST_ACCESS_KEY) {
        const token = totp.generate(`inf-sms-${userId}`);
        const redis = new Redis(REDIS_URL);
        let success = false;

        redis.hset('userCodes', userId, token);

        if (authMethod === 'call') {
          success = await callToPhone({
            phone,
            code: token,
          });
        }
        if (authMethod === 'sms' || !success) {
          success = await sendSmsToPhone({
            phone,
            text: `Ваш код подтверждения: ${token}. Никому его не сообщайте.`,
          });
        }
        if (!success) return reject();
      }

      return resolve(true);
    } catch (err) {
      console.error(err);
      return reject();
    }
  });

export const verifyEmailCode = (code: string, userId: string): boolean => {
  return totp.verify({ secret: `inf-email-${userId}`, token: code });
};

export const verifySMSCode = async ({
  code,
  userId,
  testAccessKey,
  transaction,
}: {
  code: string;
  userId: string;
  testAccessKey?: string;
  transaction: Transaction;
}): Promise<boolean> => {
  const user = await User.findByPk(userId, { transaction });
  if (!!user?.authCode) {
    return code === user?.authCode;
  }

  if ((!SMS_AUTHENTICATION_ENABLED || testAccessKey === TEST_ACCESS_KEY) && code === TEST_SMS_CONFIRMATION_CODE) {
    return true;
  }

  const redis = new Redis(REDIS_URL);
  const storedCode = await redis.hget('userCodes', userId);

  console.log('CODES', code, storedCode, code === storedCode);
  return code === storedCode;
};
