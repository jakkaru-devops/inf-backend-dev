import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import User from '../../user/models/User.model';
import Address from '../../address/models/Address.model';
import { formatPhoneNumber, generateRandomCode } from '../../../utils/common.utils';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import Requisites from '../../user/models/Requisites.model';
import fs from 'fs';
import path from 'path';
import appRoot from 'app-root-path';
import formatDate from 'date-fns/format';
import { UPLOADS_DATE_FORMAT, UPLOAD_FILES_DIRECTORY, USERS_UPLOAD_SECTION } from '../../../config/env';
import FileModel from '../../files/models/File.model';
import { createDir } from '../../files/utils';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import { transformAddress } from '../../address/utils';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import { APIError } from '../../../utils/api.utils';
import AutoType from '../../catalog/models/AutoType.model';

type IProps = {
  roles: {
    customer: Role;
    seller: Role;
    manager: Role;
    operator: Role;
    moderator: Role;
  };
  autoTypes: AutoType[];
  autoBrands: AutoBrand[];
  res: Response;
  transaction: Transaction;
};

interface IResult {
  employees: User[];
  sellers: User[];
  customers: User[];
}

export const createInitialUsersService = async ({
  roles,
  autoTypes,
  autoBrands,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const employees: User[] = [];
    const sellers: User[] = [];
    const customers: User[] = [];

    // Employee
    const { user: employeeUser } = await createEmployeeUser({
      roles: [roles.manager, roles.operator, roles.moderator],
      res,
      transaction,
    });
    employees.push(employeeUser);

    // Seller
    const { user: sellerUser } = await createSellerUser({
      roles: [roles.seller],
      autoTypes,
      autoBrands,
      res,
      transaction,
    });
    sellers.push(sellerUser);

    // Customer
    const { user: customerUser } = await createCustomerUser({
      roles: [roles.customer],
      phoneNumber: '+74111111111',
      res,
      transaction,
    });
    customers.push(customerUser);

    // Result
    return {
      employees,
      sellers,
      customers,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating initial users',
      error: err,
      strict: true,
    });
  }
};

// Employee
const createEmployeeUser = async ({
  roles,
  res,
  transaction,
}: {
  roles: Role[];
  res: Response;
  transaction: Transaction;
}): Promise<{ user: User }> => {
  try {
    // Create user's address
    const address = await Address.create(
      transformAddress({
        country: 'Россия',
        city: 'Иркутск',
        cityFiasId: '8eeed222-72e7-47c3-ab3a-9a553c31cf72',
      }),
      {
        transaction,
      },
    );

    // Create user
    let user = await User.create(
      {
        phone: formatPhoneNumber('+71111111111'),
        email: 'employee@gmail.com',
        lastname: 'Иванов',
        firstname: 'Иван',
        middlename: 'Иванович',
        phoneVerificationDate: new Date(),
        emailVerificationDate: new Date(),
        addressId: address.id,
      },
      {
        transaction,
      },
    );

    // Create UserRoles
    const userRoles: UserRoles[] = [];
    for (const role of roles) {
      const createdUserRole = await UserRoles.create(
        {
          userId: user.id,
          roleId: role.id,
        },
        {
          transaction,
        },
      );
      userRoles.push(createdUserRole);
    }

    // Transform user
    user = user.toJSON() as User;
    user.roles = userRoles
      .map(userRole => userRole.toJSON() as UserRoles)
      .map(
        userRole =>
          ({
            ...userRole,
            role: roles.find(({ id }) => id === userRole.roleId).toJSON(),
          } as UserRoles),
      );

    return {
      user,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating employee user',
      error: err,
      strict: true,
    });
  }
};

// Seller
const createSellerUser = async ({
  roles,
  autoTypes,
  autoBrands,
  res,
  transaction,
}: {
  roles: Role[];
  autoTypes: AutoType[];
  autoBrands: AutoBrand[];
  res: Response;
  transaction: Transaction;
}): Promise<{ user: User }> => {
  try {
    // Create user's address
    const address = await Address.create(
      transformAddress({
        country: 'Россия',
        region: 'г Москва',
        area: null,
        city: 'г Москва',
        settlement: null,
        street: 'ул Коломенская',
        building: '12',
        apartment: 'IV комн 20',
        postcode: '115142',
        regionFiasId: '0c5b2444-70a0-4932-980c-b4dc0d3f02b5',
        areaFiasId: null,
        cityFiasId: '0c5b2444-70a0-4932-980c-b4dc0d3f02b5',
        settlementFiasId: null,
      }),
      {
        transaction,
      },
    );

    // Create user
    const user = await User.create(
      {
        phone: formatPhoneNumber('+72111111111'),
        email: 'petrseller@gmail.com',
        lastname: 'Петров',
        firstname: 'Петр',
        middlename: 'Петрович',
        phoneVerificationDate: new Date(),
        emailVerificationDate: new Date(),
        addressId: address.id,
        sellerConfirmationDate: new Date(),
      },
      {
        transaction,
      },
    );

    // Create user's requisites entity
    await Requisites.create(
      {
        userId: user.id,
        passportSeries: '1234',
        passportNumber: '123456',
        passportGiver: 'Отделение УФМС города г Москва',
        passportGettingDate: new Date('10.10.2010'),
        passportLocationUnitCode: '123-456',
        passportRegistrationAddress: 'г Москва',
        inn: '123456789012',
        bankName: 'ПАО Сбербанк',
        bankInn: '7707083893',
        bankBik: '044525225',
        bankKs: '873393106548340000435',
        bankRs: '123353108000340000435',
      },
      {
        transaction,
      },
    );

    // Create UserRoles
    for (const role of roles) {
      await UserRoles.create(
        {
          userId: user.id,
          roleId: role.id,
        },
        {
          transaction,
        },
      );
    }

    // Create relations to product categories
    const autoTypesAndBrands = [
      { autoType: 'spectehnika', autoBrand: 'mtlb' },
      { autoType: 'legkovye', autoBrand: 'uaz' },
    ];
    for (const item of autoTypesAndBrands) {
      if (!['mtlb', 'uaz'].includes(item.autoBrand)) continue;
      await SellerAutoBrands.create(
        {
          userId: user.id,
          autoTypeId: autoTypes.find(el => el.label === item.autoType).id,
          autoBrandId: autoBrands.find(el => el.label === item.autoBrand).id,
        },
        {
          transaction,
        },
      );
    }

    const docs = ['passportMainPageDoc', 'passportReginstrationPageDoc', 'innDoc', 'snilsDoc'];
    for (const doc of docs) {
      const fileName = `${doc}.docx`;
      const fileInitPath = path.join(appRoot + `/_init/users/sellers/${fileName}`);
      // Get static file
      const stat = fs.statSync(fileInitPath);
      // Define file's data
      const file = {
        name: fileName,
        size: stat.size,
      };
      const nowDate = formatDate(new Date(), UPLOADS_DATE_FORMAT);
      const newFileName = `${generateRandomCode({
        length: 20,
        symbols: false,
        uppercase: false,
        excludeSimilarCharacters: false,
      })}-${file.name}`;
      const fileDBPath = `${USERS_UPLOAD_SECTION}/${user.id}/${nowDate}/${newFileName}`;
      const directoryPath = `${UPLOAD_FILES_DIRECTORY}/${USERS_UPLOAD_SECTION}/${user.id}/${nowDate}`;
      const ext = file.name.split('.').pop();

      const fileEntity = await FileModel.create(
        {
          // userId: authUser.id,
          name: file.name,
          ext,
          size: file.size,
          path: fileDBPath,
        },
        { transaction },
      );

      await SellerRegisterFile.create(
        {
          userId: user.id,
          fileId: fileEntity.id,
          label: `user.${doc}`,
        },
        { transaction },
      );

      if (!fs.existsSync(directoryPath)) {
        const newDir = await createDir(directoryPath);
        if (!newDir) {
          throw APIError({
            res,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'An error has occured while creating seller user',
            strict: true,
          });
        }
      }
      fs.copyFile(fileInitPath, `${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`, err => {
        if (err) {
          return {
            error: {
              status: err.code,
              message: err.message,
              error: err,
            },
          };
        }
      });
    }

    return {
      user,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating seller user',
      error: err,
    });
  }
};

// Customer
const createCustomerUser = async ({
  roles,
  phoneNumber,
  res,
  transaction,
}: {
  roles: Role[];
  phoneNumber: string;
  res: Response;
  transaction: Transaction;
}): Promise<{ user: User }> => {
  try {
    // Create user
    const user = await User.create(
      {
        phone: formatPhoneNumber(phoneNumber),
        phoneVerificationDate: new Date(),
      },
      {
        transaction,
      },
    );

    // Create UserRoles
    for (const role of roles) {
      await UserRoles.create(
        {
          userId: user.id,
          roleId: role.id,
        },
        {
          transaction,
        },
      );
    }

    return {
      user,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating customer user',
      error: err,
      strict: true,
    });
  }
};
