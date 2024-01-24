import { Op } from 'sequelize';
import User from '../../user/models/User.model';
import Organization from '../models/Organization.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import Address from '../../address/models/Address.model';
import OrganizationSeller from '../models/OrganizationSeller.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import JuristicSubjectCustomer from '../../user/models/JuristicSubjectCustomer.model';
import { IOrganizationByInn } from '../interfaces';
import { getOrgName, getOrganizationComission } from '../utils';
import { SERVICE_ORGANIZATION_INN } from '../data';
import axios from 'axios';
import { DADATA_TOKEN } from '../../../config/env';
import { IDaDataOrgResponse } from '../../../interfaces/legalEntity.interfaces';

interface IProps {
  inn: string;
  type: 'organization' | 'jurSubject';
  authUser: User;
}

export const searchOrganizationByInnService = async ({ inn, type, authUser }: IProps) => {
  const registeredOrg =
    type === 'jurSubject'
      ? await JuristicSubject.findOne({
          where: { inn },
          include: [
            { model: Address, as: 'juristicAddress', required: true },
            { model: Address, as: 'mailingAddress', required: true },
            {
              model: JuristicSubjectCustomer,
              as: 'customerRelations',
              where: { userId: authUser.id },
              required: false,
              separate: true,
            },
          ],
        })
      : await Organization.findOne({
          where: { inn },
          include: [
            {
              model: OrganizationBranch,
              as: 'branches',
              required: false,
              where: {
                confirmationDate: {
                  [Op.ne]: null,
                },
              },
              include: [{ model: Address, as: 'actualAddress' }],
              separate: true,
            },
            { model: Address, as: 'actualAddress', required: true },
            {
              model: OrganizationSeller,
              as: 'sellers',
              where: {
                userId: authUser.id,
              },
              required: false,
              separate: true,
            },
          ],
        });
  let organization: IOrganizationByInn = null;

  // If organization is registered
  if (!!registeredOrg) {
    organization = {
      ...getOrganizationComission(registeredOrg as Organization),
      id: registeredOrg.id,
      isRegistered: true,
      entityCode: registeredOrg.entityCode,
      entityType: registeredOrg.entityType,
      inn: registeredOrg.inn,
      kpp: registeredOrg.kpp,
      ogrn: registeredOrg.ogrn,
      bankName: registeredOrg?.bankName,
      bankBik: registeredOrg?.bankBik,
      bankKs: registeredOrg?.bankKs,
      bankRs: registeredOrg?.bankRs,
      hasNds: registeredOrg?.hasNds,
      branches: (registeredOrg as Organization)?.branches,
      shopName: (registeredOrg as Organization).shopName,
      directorFirstname: (registeredOrg as Organization)?.directorFirstname,
      directorLastname: (registeredOrg as Organization)?.directorLastname,
      directorMiddlename: (registeredOrg as Organization)?.directorMiddlename,
      actualAddress: (registeredOrg as Organization)?.actualAddress,
      juristicAddress: (registeredOrg as Organization)?.juristicAddress,
      mailingAddress: (registeredOrg as Organization)?.mailingAddress,
      name: registeredOrg.name,
      pureName: registeredOrg.name,
      authUserIsBeingSeller: !!(registeredOrg as Organization)?.sellers?.[0],
      isServiceOrganization: registeredOrg.inn === SERVICE_ORGANIZATION_INN,
    };
  } else {
    // Request to DaData
    const response = await axios({
      method: 'post',
      url: 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/findById/party',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Token ${DADATA_TOKEN}`,
      },
      data: {
        query: inn,
      },
    });
    const suggestions = (response.data as IDaDataOrgResponse).suggestions;
    const foundOrg = suggestions[0];
    const address = foundOrg.data.address.data;

    /* // replace Moscow fiasId by our city id
        if (address.city_fias_id === '0c5b2444-70a0-4932-980c-b4dc0d3f02b5') {
          address.city_fias_id = '8210b35f-0b7d-4a23-80dc-e8185d85715a';
        }
        // replace St.-Petersburg fiasId by our city id
        if (address.city_fias_id === 'c2deb16a-0330-4f05-821f-1d09c93331e6') {
          address.city_fias_id = 'be54dc92-ee15-11eb-9a03-0242ac130003';
        }
        // replace Sevastopol fiasId by our city id
        if (address.city_fias_id === '6fdecb78-893a-4e3f-a5ba-aa062459463b') {
          address.city_fias_id = '7ff52302-ee16-11eb-9a03-0242ac130003';
        } */

    organization = {
      isRegistered: false,
      inn: foundOrg.data.inn,
      kpp: foundOrg.data.kpp,
      ogrn: foundOrg.data.ogrn,
      name: getOrgName(
        {
          name: foundOrg.data.name.short_with_opf || foundOrg.data.name.full_with_opf,
          entityCode: foundOrg.data.opf.code,
        },
        true,
        true,
      ),
      pureName: foundOrg.data.name.short_with_opf || foundOrg.data.name.full_with_opf,
      entityCode: foundOrg.data.opf.code,
      entityType: foundOrg.data.opf.short,
      shopName: null,
      branches: [],
      isServiceOrganization: foundOrg.data.inn === SERVICE_ORGANIZATION_INN,
    };

    let settlement = ``;
    let settlementFiasId = address.settlement_fias_id || address.city_fias_id;
    if (address?.region_with_type !== address?.city_with_type) {
      settlement += `${address?.region_with_type}, `;
    }
    if (!['мкр'].includes(address.settlement_type)) {
      settlement += address.settlement_with_type || address.city_with_type;
    } else {
      settlement += address.city_with_type;
      settlementFiasId = address.city_fias_id;
    }

    organization.juristicAddress = {
      country: address.country,
      region: address.region_with_type,
      regionFiasId: address.region_fias_id,
      area: address.area_with_type,
      areaFiasId: address.area_fias_id,
      city: address.city_with_type,
      cityFiasId: address.city_fias_id,
      settlement,
      settlementFiasId,
      street: address.street_with_type,
      building: address.house,
      apartment: address.flat,
      postcode: address.postal_code,
    };
    organization.actualAddress = organization.juristicAddress;

    // ИП
    if (foundOrg.data.opf.short === 'ИП') {
      organization.directorFirstname = foundOrg.data?.fio?.name;
      organization.directorLastname = foundOrg.data?.fio?.surname;
      organization.directorMiddlename = foundOrg.data?.fio?.patronymic;
    } else {
      const [lastname, firstname, middlename] = foundOrg.data.management.name.split(' ');
      organization.directorFirstname = firstname;
      organization.directorLastname = lastname;
      organization.directorMiddlename = middlename;
    }
  }

  return organization;
};
