import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import Organization from '../../organization/models/Organization.model';
import User from '../../user/models/User.model';
import { createOrganizationService } from '../../organization/services/createOrganization.service';
import fs from 'fs';
import path from 'path';
import appRoot from 'app-root-path';
import formatDate from 'date-fns/format';
import {
  UNKNOWN_UPLOAD_SECTION,
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  USERS_UPLOAD_SECTION,
} from '../../../config/env';
import FileModel from '../../files/models/File.model';
import { createDir } from '../../files/utils';
import { generateRandomCode } from '../../../utils/common.utils';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import UserRoles from '../../role/models/UserRoles.model';
import { ORG_ENTITY_TYPES } from '../../organization/data';
import { APIError } from '../../../utils/api.utils';
import organizationsService from '../../organization/organizations.service';

type IProps = {
  managerUser: User;
  managerRole: UserRoles;
  sellerUser: User;
  res: Response;
  transaction: Transaction;
};

interface IResult {
  organizations: Organization[];
}

export const createInitialOrganizationsService = async ({
  managerUser,
  managerRole,
  sellerUser,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const organizations: Organization[] = [];

    const docs = ['statuteDoc', 'innDoc', 'ogrnDoc', 'cardDoc'];
    const files = [];

    for (const doc of docs) {
      const fileName = `${doc}.docx`;
      const fileInitPath = path.join(appRoot + `/_init/organizations/${fileName}`);
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
      const fileDBPath = `${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest/${newFileName}`;
      const directoryPath = `${UPLOAD_FILES_DIRECTORY}/${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest`;
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

      if (!fs.existsSync(directoryPath)) {
        const newDir = await createDir(directoryPath);
        if (!newDir) {
          throw APIError({
            res,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'An error has occured while creating organizations',
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

      // Add created file to the list
      files.push({
        file: {
          id: fileEntity.id,
        },
        label: `org.${doc}`,
      });
    }

    const orgEntityType = ORG_ENTITY_TYPES.find(({ name }) => name?.short === 'ООО');

    const orgData: any = {
      priceBenefitPercent: 8,
      hasNds: true,
      shopName: 'remont shop',
      creatorUserId: '', // TODO
      email: 'remontorg@gmail.com',
      phone: '+71234567890',
      directorFirstname: 'Денис',
      directorLastname: 'Афонин',
      directorMiddlename: 'Анатольевич',
      juristicAddress: {
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
      },
      actualAddress: {
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
      },
      mailingAddress: {
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
      },
      entityCode: orgEntityType.code,
      entityType: orgEntityType.name?.short,
      name: 'ООО "РЕМОНТ"',
      inn: '7725469755',
      kpp: '772501001',
      ogrn: '1187746310080',
      bankName: 'Альфа-Банк',
      bankInn: '7728168971',
      bankBik: '044525593',
      bankKs: '30101810200000000593',
      bankRs: '30101810200000000678',
      branches: [
        {
          actualAddress: {
            country: 'Россия',
            region: 'Иркутская обл',
            area: null,
            city: 'г Иркутск',
            settlement: null,
            street: 'ул Ленина',
            building: '10',
            apartment: '10',
            postcode: '665862',
            regionFiasId: '6466c988-7ce3-45e5-8b97-90ae16cb1249',
            areaFiasId: null,
            cityFiasId: '8eeed222-72e7-47c3-ab3a-9a553c31cf72',
            settlementFiasId: null,
          },
          kpp: '772501001',
        },
      ],
      files,
    };

    // Create organization
    const { org, branches } = await organizationsService.createOrganization(
      {
        orgData,
        authUser: managerUser,
        authUserRole: managerRole,
      },
      { transaction },
    );
    organizations.push(org);

    // Create org seller
    const orgSeller = await OrganizationSeller.create(
      {
        organizationId: org.id,
        userId: sellerUser.id,
        branchId: branches.find(branch => branch.isMain).id,
        confirmationDate: new Date(),
      },
      {
        transaction,
      },
    );
    if (!orgSeller) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'An error has occured while creating organization seller',
        error: orgSeller as any,
        strict: true,
      });
    }

    return {
      organizations,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating initial organizations',
      error: err,
      strict: true,
    });
  }
};
