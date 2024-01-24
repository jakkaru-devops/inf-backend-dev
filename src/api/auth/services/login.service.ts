import seq, { Transaction } from 'sequelize';
import { IUserRoleOption } from '../../role/interfaces';
import { IFrontendPlatform, IServiceError } from '../../../interfaces/common.interfaces';
import { GOOGLE_PROJECT_ID, GOOGLE_RECAPTCHA_SECRET_KEYS, SECURED_BY_GOOGLE_RECAPTCHA } from '../../../config/env';
import httpStatus from 'http-status';
import AuthBannedIP from './../models/AuthBannedIP.model';
import { ServiceError } from '../../../core/utils/serviceError';
import differenceInMinutes from 'date-fns/differenceInMinutes';
import addDate from 'date-fns/add';
import AuthAttempt from './../models/AuthAttempt.model';
import { Op } from 'sequelize';
import AuthPhoneBlock from './../models/AuthPhoneBlock.model';
import axios from 'axios';
import User from '../../user/models/User.model';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import { generatePayload, sendAuthCode, verifySMSCode } from '../../../utils/auth.utils';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';
import { ENotificationType } from '../../notification/interfaces';
import { SocketServer } from '../../../core/socket';
import { createOrderRequestService } from '../../order/services/createOrderRequest.service';
import { simplifyHtml } from '../../../utils/common.utils';

/** In minutes */
const MAX_AUTH_BLOCK_TIME = 60 * 24;
/** In minutes */
const AUTH_TIME_POINTS = [1, 5, 10, MAX_AUTH_BLOCK_TIME];

interface IProps {
  phone: string;
  role: IUserRoleOption;
  confirmCode?: string;
  platform: IFrontendPlatform;
  ip: string;
  orderRequest?: any;
  testAccessKey?: string;
  googleReCaptchaSiteKey?: string;
  googleReCaptchaToken?: string;
}

export const loginService = async (
  {
    phone,
    role,
    confirmCode,
    platform,
    ip,
    orderRequest: orderRequestData,
    testAccessKey,
    googleReCaptchaSiteKey,
    googleReCaptchaToken,
  }: IProps,
  { io, transaction }: { io: SocketServer; transaction: Transaction },
) => {
  const authMethod = 'sms';
  const googleReCaptchaSecretKey = GOOGLE_RECAPTCHA_SECRET_KEYS?.[platform];
  const securedByCaptcha = SECURED_BY_GOOGLE_RECAPTCHA;
  const nowDate = new Date();
  const nowTime = nowDate.getTime();
  let secondsBeforeNextAttempt = 0;

  const bannedIPError: IServiceError = {
    status: httpStatus.TOO_MANY_REQUESTS,
    message: 'Авторизация недоступна',
  };

  // Verify if IP is not banned
  const authBannedIP = await AuthBannedIP.findOne({
    where: { ip },
  });
  if (!!authBannedIP) {
    if (new Date(authBannedIP.banExpiresAt).getTime() < nowTime) {
      throw new ServiceError(bannedIPError);
    }
  }

  // Ban IP after 100 attempts of auth
  const timeDayBack = addDate(nowDate, { days: -1 });
  const oneDayAuthAttempts = await AuthAttempt.findAll({
    where: {
      ip,
      createdAt: { [Op.gt]: timeDayBack },
    },
    transaction,
  });
  if (oneDayAuthAttempts.length >= 100) {
    await AuthBannedIP.findOrCreate({
      where: { ip },
      defaults: {
        ip,
        banExpiresAt: addDate(nowDate, { years: 99 }),
      },
    });
    throw new ServiceError(bannedIPError);
  }

  // Verify phone number format
  if (!phone.length) {
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Некорректный номер телефона',
    });
  }

  // Block auth for phone number after a row of auth attempts
  if (!confirmCode) {
    // Save each auth attempt
    await AuthAttempt.create({
      phone,
      ip,
    });

    const lastAuthBlock = await AuthPhoneBlock.findOne({
      where: { phone },
      transaction,
    });

    if (!!lastAuthBlock) {
      const expiresAtTime = new Date(lastAuthBlock.expiresAt).getTime();

      if (expiresAtTime > nowTime)
        return {
          success: false,
          secondsBeforeNextAttempt: (expiresAtTime - nowTime) / 1000,
        };
    }

    // Define new auth block values
    const authBlock = lastAuthBlock || new AuthPhoneBlock();
    const newAuthBlockStep = !!lastAuthBlock
      ? differenceInMinutes(nowDate, new Date(lastAuthBlock.createdAt)) < MAX_AUTH_BLOCK_TIME
        ? lastAuthBlock.step + 1
        : 0
      : 0;
    authBlock.phone = phone;
    authBlock.step = newAuthBlockStep;

    // authBlock.step max value is AUTH_TIME_POINTS' last index
    if (newAuthBlockStep < AUTH_TIME_POINTS.length) {
      authBlock.expiresAt = addDate(nowDate, { minutes: AUTH_TIME_POINTS[newAuthBlockStep] });
      authBlock.step = newAuthBlockStep;
    } else {
      authBlock.step = AUTH_TIME_POINTS.length - 1;
    }

    await authBlock.save();

    secondsBeforeNextAttempt = (new Date(authBlock.expiresAt).getTime() - nowTime) / 1000;
  }

  // Verify reCaptcha token
  if (!confirmCode && securedByCaptcha) {
    try {
      const verifyRes = await axios({
        method: 'post',
        url: `https://recaptchaenterprise.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/assessments?key=${googleReCaptchaSecretKey}`,
        data: {
          event: {
            token: googleReCaptchaToken,
            siteKey: googleReCaptchaSiteKey,
            expectedAction: 'login',
          },
        },
      });
      console.log('verifyRes', verifyRes?.data);

      if (!verifyRes?.data?.tokenProperties?.valid) {
        throw new ServiceError({
          status: httpStatus.BAD_REQUEST,
          message: 'Авторизация не верифицирована',
        });
      }
    } catch (err) {
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: 'Авторизация не верифицирована',
      });
    }
  }

  // Restore user if he is already in DB and was deleted
  const deletedUser = await User.findOne({
    where: { phone },
    paranoid: false,
    transaction,
  });
  if (!!deletedUser?.deletedAt) {
    if (!!role) {
      const roleEntity = await Role.findOne({ where: { label: role }, transaction });
      const userRole = await UserRoles.findOne({
        where: {
          roleId: roleEntity.id,
          userId: deletedUser.id,
        },
        paranoid: false,
        transaction,
      });
      await deletedUser.restore({ transaction });
      await userRole.restore({ transaction });
    } else {
      const activeUserRoles = await UserRoles.findAll({
        where: {
          userId: deletedUser.id,
        },
        transaction,
      });
      if (!!activeUserRoles?.length) {
        await deletedUser.restore({ transaction });
      }
    }
  }

  const searchOptions: seq.FindOptions = {
    transaction,
  };
  searchOptions.where = {
    phone,
  };
  if (!!role) {
    searchOptions.include = [
      {
        model: UserRoles,
        as: 'roles',
        required: false,
        include: [
          {
            model: Role,
            as: 'role',
            where: {
              label: role,
            },
          },
        ],
      },
    ];
  }

  let user = await User.findOne(searchOptions);

  // if (!!user && !!user.bannedUntil) {
  //   throw APIError({
  //     res,
  //     status: httpStatus.FORBIDDEN,
  //     message: "Пользователь с этим номером телефона заблокирован",
  //   });
  // }

  if (!user) {
    if (role === 'customer' || role === 'seller') {
      // Create user
      user = await User.create(
        {
          phone,
        },
        { transaction },
      );
      // Find provided role's entity
      const roleEntity = await Role.findOne({
        where: {
          label: role,
        },
        transaction,
      });
      // Create role for user
      await UserRoles.create(
        {
          userId: user.id,
          roleId: roleEntity.id,
        },
        { transaction },
      );

      if (!confirmCode) {
        const success = await sendAuthCode({ phone, userId: user.id, authMethod, testAccessKey, transaction });

        if (!success) {
          throw new ServiceError({
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Код не был отправлен',
          });
        }

        return {
          success,
          secondsBeforeNextAttempt,
        };
      }
    }

    throw new ServiceError({
      status: httpStatus.NOT_FOUND,
      message: 'Пользователь не найден',
    });
  }

  if (!confirmCode) {
    const success = await sendAuthCode({ phone, userId: user.id, authMethod, testAccessKey, transaction });

    if (!success) {
      throw new ServiceError({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Код не был отправлен',
      });
    }

    return {
      success,
      secondsBeforeNextAttempt,
    };
  }

  // Create new role for user
  if (!!role && (!user.roles || user.roles.length === 0) && !!['customer', 'seller'].includes(role)) {
    const roleEntity = await Role.findOne({
      where: {
        label: role,
      },
      transaction,
    });
    await UserRoles.create(
      {
        roleId: roleEntity.id,
        userId: user.id,
      },
      { transaction },
    );

    // Send payload
    return {
      payload: generatePayload(user),
      user,
      role: roleEntity.id,
    };
  }

  // Code verifying
  if (!(await verifySMSCode({ code: confirmCode, userId: user.id, testAccessKey, transaction }))) {
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Неверный код подтверждения',
    });
  }

  // After successfull auth delete AuthPhoneBlock
  await AuthPhoneBlock.destroy({
    where: { phone },
    force: true,
    transaction,
  });

  // Verification successful
  const userAlreadyRegistered = !!user.phoneVerificationDate;
  if (!user.phoneVerificationDate) {
    await user.update(
      {
        phoneVerificationDate: new Date(),
      },
      { transaction },
    );
  }

  if (role === 'customer' && !userAlreadyRegistered) {
    const customerRole = await Role.findOne({
      where: {
        label: 'customer',
      },
      transaction,
    });

    await createNotificationForAllManagersService({
      type: ENotificationType.customerRegistered,
      autoread: false,
      aboutUserId: user.id,
      aboutUserRoleId: customerRole.id,
      data: {
        user: {
          id: user.id,
          phone: user.phone,
        },
      },
      io,
      transaction,
    });
  }

  if (orderRequestData) {
    const authUserRole = await UserRoles.findOne({
      where: {
        userId: user.id,
      },
      include: [
        {
          model: Role,
          as: 'role',
          required: true,
          where: {
            label: 'customer',
          },
        },
      ],
      transaction,
    });

    await createOrderRequestService({
      authUser: user,
      authUserRole,
      deliveryAddress: orderRequestData.deliveryAddress,
      settlements: orderRequestData.settlements,
      paymentPostponedAt: orderRequestData?.paymentPostponedAt,
      selectedSellerIds: orderRequestData.selectedSellerIds,
      comment: simplifyHtml(orderRequestData.comment),
      fileIds: orderRequestData.fileIds,
      requestProducts: orderRequestData.products,
      repeatOrder: false,
      io,
      transaction,
    });
  }

  const roleEntity = await Role.findOne({ where: { label: role }, transaction });

  // Send payload
  return {
    payload: generatePayload(user),
    user,
    role: roleEntity.id,
  };
};
