import { Transaction } from 'sequelize';
import { IEntityId } from '../../../interfaces/common.interfaces';
import JuristicSubject from '../models/JuristicSubject.model';
import Address from '../../address/models/Address.model';
import JuristicSubjectCustomer from '../models/JuristicSubjectCustomer.model';
import User from '../models/User.model';
import UserRoles from '../../role/models/UserRoles.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import { transformAddress } from '../../address/utils';
import { UPLOAD_FILES_DIRECTORY } from '../../../config/env';
import fs from 'fs';
import { IOrganizationInfo } from '../../organization/interfaces';
import { uploadPdf } from '../../../utils/pdf.utils';
import { getOrgName } from '../../organization/utils';
import { isManager } from '../utils';

interface IProps {
  id: IEntityId;
  juristicSubjectData: JuristicSubject;
  authUser: User;
  authUserRole: UserRoles;
}

export const updateJuristicSubjectService = async (
  { id, juristicSubjectData, authUser, authUserRole }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const jurSubject = await JuristicSubject.findByPk(id, {
    include: [
      { model: Address, as: 'juristicAddress' },
      { model: Address, as: 'mailingAddress' },
    ],
    transaction,
  });

  if (isManager(authUserRole)) {
    if (!jurSubject)
      throw new ServiceError({
        status: httpStatus.NOT_FOUND,
        message: 'Юридическое лицо не найдено',
      });
  } else {
    const jurSubjectCustomer = await JuristicSubjectCustomer.findOne({
      where: {
        juristicSubjectId: jurSubject.id,
        userId: authUser.id,
      },
      transaction,
    });

    if (!jurSubject || !jurSubjectCustomer)
      throw new ServiceError({
        status: httpStatus.NOT_FOUND,
        message: 'Юридическое лицо не найдено',
      });
  }

  // Juristic address
  await jurSubject.juristicAddress.update(transformAddress(juristicSubjectData.juristicAddress), {
    transaction,
  });

  // Mailing address
  await jurSubject.mailingAddress.update(transformAddress(juristicSubjectData.mailingAddress), {
    transaction,
  });

  let juristicNds: string = '';
  if (juristicSubjectData.hasNds === true) {
    juristicNds = 'НДС 20%';
  } else {
    juristicNds = 'Без НДС';
  }

  await fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${jurSubject.path}`);

  const pathToCustomerTemplate = 'templates/customerOrganizationInfo.html';

  const dataJuristic: IOrganizationInfo = {
    inn: juristicSubjectData.inn,
    orgnLabel: juristicSubjectData.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
    ogrn: juristicSubjectData.ogrn,
    kpp: juristicSubjectData.kpp,
    orgNameLabel: juristicSubjectData.entityType === 'ИП' ? 'Наименование ИП' : 'Наименование юр. лица',
    orgName: juristicSubjectData.name,
    email: juristicSubjectData.email,
    organizationNds: juristicNds,
    juristicAddressCountry: juristicSubjectData.juristicAddress.country,
    juristicAddressRegion: juristicSubjectData.juristicAddress.region,
    juristicAddressSettlement: juristicSubjectData.juristicAddress.settlement,
    juristicAddressStreet: juristicSubjectData.juristicAddress.street,
    juristicAddressBuilding: juristicSubjectData.juristicAddress.building,
    juristicAddressApartment: juristicSubjectData.juristicAddress.apartment,
    mailingAddressCountry: juristicSubjectData.mailingAddress.country,
    mailingAddressRegion: juristicSubjectData.mailingAddress.region,
    mailingAddressSettlement: juristicSubjectData.mailingAddress.settlement,
    mailingAddressStreet: juristicSubjectData.mailingAddress.street,
    mailingAddressBuilding: juristicSubjectData.mailingAddress.building,
    mailingAddressApartment: juristicSubjectData.mailingAddress.apartment,
    bankName: juristicSubjectData.bankName,
    bankInn: juristicSubjectData.bankInn,
    bankBik: juristicSubjectData.bankBik,
    bankKs: juristicSubjectData.bankKs,
    bankRs: juristicSubjectData.bankRs,
  };

  const customer = await uploadPdf({
    data: dataJuristic,
    pathToTemplate: pathToCustomerTemplate,
    pathToPdfFolder: `juristicData/${juristicSubjectData.inn}`,
    pdfName: `${juristicSubjectData.inn}.pdf`,
    transaction,
  });

  const updatedJuristicSubject = await jurSubject.update(
    {
      ...juristicSubjectData,
      name: getOrgName(juristicSubjectData, true, false),
      nameWithoutType: getOrgName(juristicSubjectData, false, false),
      path: customer.file.path,
    },
    { transaction },
  );

  return updatedJuristicSubject;
};
