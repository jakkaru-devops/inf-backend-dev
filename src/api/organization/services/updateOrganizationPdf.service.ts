import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import Address from '../../address/models/Address.model';
import FileModel from '../../files/models/File.model';
import Organization from '../models/Organization.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import OrganizationFile from '../models/OrganizationFile.model';
import fs from 'fs';
import { UPLOAD_FILES_DIRECTORY } from '../../../config/env';
import { IOrganizationInfo } from '../interfaces';
import { uploadPdf } from '../../../utils/pdf.utils';

interface IProps {
  organization: Organization;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  organization: Organization;
}

export const updateOrganizationPdfService = async ({ organization, res, transaction }: IProps): Promise<IResult> => {
  try {
    let orgNds: string = '';
    if (organization.hasNds === true) {
      orgNds = 'НДС 20%';
    } else {
      orgNds = 'Без НДС';
    }
    const oldPdfPath = organization?.path;

    const dataOrg: IOrganizationInfo = {
      inn: organization.inn,
      orgnLabel: organization.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
      ogrn: organization.ogrn,
      kpp: organization.kpp,
      orgNameLabel: organization.entityType === 'ИП' ? 'Наименование ИП' : 'Наименование юр. лица',
      orgName: organization.name,
      email: organization.email,
      organizationNds: orgNds,
      juristicAddressCountry: organization.juristicAddress.country,
      juristicAddressRegion: organization.juristicAddress.region,
      juristicAddressSettlement: organization.juristicAddress.settlement,
      juristicAddressStreet: organization.juristicAddress.street,
      juristicAddressBuilding: organization.juristicAddress.building,
      juristicAddressApartment: organization.juristicAddress.apartment,
      mailingAddressCountry: organization.mailingAddress.country,
      mailingAddressRegion: organization.mailingAddress.region,
      mailingAddressSettlement: organization.mailingAddress.settlement,
      mailingAddressStreet: organization.mailingAddress.street,
      mailingAddressBuilding: organization.mailingAddress.building,
      mailingAddressApartment: organization.mailingAddress.apartment,
      actualAddressCountry: organization.actualAddress.country,
      actualAddressRegion: organization.actualAddress.region,
      actualAddressSettlement: organization.actualAddress.settlement,
      actualAddressStreet: organization.actualAddress.street,
      actualAddressBuilding: organization.actualAddress.building,
      actualAddressApartment: organization.actualAddress.apartment,
      bankName: organization.bankName,
      bankInn: organization.bankInn,
      bankBik: organization.bankBik,
      bankKs: organization.bankKs,
      bankRs: organization.bankRs,
      directorLabel: organization.entityType === 'ИП' ? 'ФИО ИП' : 'ФИО директора',
      directorFirstname: organization.directorFirstname,
      directorMiddlename: organization.directorMiddlename,
      directorLastname: organization.directorLastname,
    };

    if (!!oldPdfPath) {
      fs.readFile(`${UPLOAD_FILES_DIRECTORY}/${oldPdfPath}`.replace(/\\/g, '/'), (err, oldFile) => {
        if (!!oldFile) {
          fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${oldPdfPath}`);
        }
      });
    }

    const pathToPdfTemplate = 'templates/sellerOrganizationInfo.html';

    const uploadedPdf = await uploadPdf({
      data: dataOrg,
      pathToTemplate: pathToPdfTemplate,
      pathToPdfFolder: `organization/${organization.inn}`,
      pdfName: `${organization.inn}.pdf`,
      transaction,
    });

    await Organization.update(
      {
        path: uploadedPdf.file.path,
      },
      {
        where: {
          id: organization.id,
        },
        transaction,
      },
    );

    return {
      organization,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Не удалось обновить PDF документ организации',
    });
  }
};
