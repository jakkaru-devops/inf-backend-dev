import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { verifyPermissions } from '../../../utils/auth.utils';
import { formatPhoneNumber } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import Organization from '../models/Organization.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import OrganizationFile from '../models/OrganizationFile.model';
import OrganizationSeller from '../models/OrganizationSeller.model';
import { getOrgName } from './../utils';
import { ENotificationType } from '../../notification/interfaces';
import { IOrganizationInfo } from '../interfaces';
import { uploadPdf } from '../../../utils/pdf.utils';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';
import { ORG_ENTITY_TYPES } from '../data';
import { MANAGER_ROLES } from '../../role/data';
import { SocketServer } from '../../../core/socket';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  orgData: Organization;
  authUser: User;
  authUserRole: UserRoles;
  sellerData?: { userId: string };
}

export const createOrganizationService = async (
  { orgData, authUser, authUserRole, sellerData }: IProps,
  { io, transaction }: { io?: SocketServer; transaction: Transaction },
): Promise<{
  org: Organization;
  orgSeller: OrganizationSeller;
  branches: OrganizationBranch[];
}> => {
  try {
    // Format phone number
    orgData.phone = formatPhoneNumber(orgData.phone);

    // Juristic address
    const juristicAddress = await Address.create(transformAddress(orgData.juristicAddress), {
      transaction,
    });
    orgData.juristicAddressId = juristicAddress.id;
    // Actual address
    const actualAddress = await Address.create(transformAddress(orgData.actualAddress), {
      transaction,
    });
    orgData.actualAddressId = actualAddress.id;
    // Mailing address
    const mailingAddress = await Address.create(transformAddress(orgData.mailingAddress), {
      transaction,
    });
    orgData.mailingAddressId = mailingAddress.id;

    // create PDF file

    // check directory for PDFile

    // Define entityCode if not provided
    if (typeof orgData.entityCode === 'undefined') {
      if (!!orgData.entityType) {
        let entityCode: string = ORG_ENTITY_TYPES.find(el => el?.name?.short === orgData.entityType)?.code;
        orgData.entityCode = entityCode;
      }
    }

    let orgNds: string = '';
    if (orgData.hasNds === true) {
      orgNds = 'НДС 20%';
    } else {
      orgNds = 'Без НДС';
    }

    if (orgData.entityType === 'ИП') {
      orgData.kpp = '000000000';
    }

    const pathToSellerTemplate = 'templates/sellerOrganizationInfo.html';

    const pdfOrgData: IOrganizationInfo = {
      inn: orgData.inn,
      orgnLabel: orgData.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
      ogrn: orgData.ogrn,
      kpp: orgData.kpp,
      orgNameLabel: orgData.entityType === 'ИП' ? 'Наименование ИП' : 'Наименование юр. лица',
      orgName: orgData.name,
      email: orgData.email,
      organizationNds: orgNds,
      juristicAddressCountry: juristicAddress.country,
      juristicAddressRegion: juristicAddress.region,
      juristicAddressSettlement: juristicAddress.settlement,
      juristicAddressStreet: juristicAddress.street,
      juristicAddressBuilding: juristicAddress.building,
      juristicAddressApartment: juristicAddress.apartment,
      mailingAddressCountry: mailingAddress.country,
      mailingAddressRegion: mailingAddress.region,
      mailingAddressSettlement: mailingAddress.settlement,
      mailingAddressStreet: mailingAddress.street,
      mailingAddressBuilding: mailingAddress.building,
      mailingAddressApartment: mailingAddress.apartment,
      actualAddressCountry: actualAddress.country,
      actualAddressRegion: actualAddress.region,
      actualAddressSettlement: actualAddress.settlement,
      actualAddressStreet: actualAddress.street,
      actualAddressBuilding: actualAddress.building,
      actualAddressApartment: actualAddress.apartment,
      bankName: orgData.bankName,
      bankInn: orgData.bankInn,
      bankBik: orgData.bankBik,
      bankKs: orgData.bankKs,
      bankRs: orgData.bankRs,
      directorLabel: orgData.entityType === 'ИП' ? 'ФИО ИП' : 'ФИО директора',
      directorFirstname: orgData.directorFirstname,
      directorMiddlename: orgData.directorMiddlename,
      directorLastname: orgData.directorLastname,
    };

    const sellerInfo = await uploadPdf({
      data: pdfOrgData,
      pathToTemplate: pathToSellerTemplate,
      pathToPdfFolder: `organization/${orgData.inn}`,
      pdfName: `${orgData.inn}.pdf`,
    });

    delete orgData.id;

    // Only managers allowed to change additional commission
    if (!MANAGER_ROLES.includes(authUserRole.role.label)) {
      delete orgData.priceBenefitPercentAcquiring;
      delete orgData.priceBenefitPercentInvoice;
    }

    // Create org
    const org = await Organization.create(
      {
        ...orgData,
        name: getOrgName(orgData, true, false),
        nameWithoutType: getOrgName(orgData, false, false),
        creatorUserId: authUser.id,
        confirmationDate: ['manager', 'operator'].includes(authUserRole?.role?.label) ? new Date() : null,
        path: sellerInfo.file.path,
      },
      {
        transaction,
      },
    );

    // Create org files
    for (const fileData of orgData.files) {
      await OrganizationFile.create(
        {
          organizationId: org.id,
          fileId: fileData.file.id,
          label: fileData.label,
        },
        {
          transaction,
        },
      );
    }

    orgData.branches = orgData.branches || [];
    if (!orgData.branches.find(el => el.isMain)) {
      orgData.branches.push({
        actualAddressId: actualAddress.id,
        isMain: true,
        confirmationDate: verifyPermissions('moderateOrganizationsAvailable', { authUserRole }).result
          ? new Date()
          : null,
      } as any);
    }

    // Create org branches
    // TODO: validate if there is only one main branch in the request body
    const branches: OrganizationBranch[] = [];
    for (const branchData of orgData.branches) {
      const address = branchData.isMain
        ? actualAddress
        : await Address.create(transformAddress(branchData.actualAddress), {
            transaction,
          });
      const branch = await OrganizationBranch.create(
        {
          organizationId: org.id,
          actualAddressId: address.id,
          creatorUserId: authUser.id,
          isMain: branchData.isMain,
          confirmationDate: ['manager', 'operator'].includes(authUserRole?.role?.label) ? new Date() : null,
          kpp: branchData.isMain ? orgData.kpp : branchData.kpp,
          bankName: branchData.isMain ? orgData.bankName : branchData.bankName,
          bankInn: branchData.isMain ? orgData.bankInn : branchData.bankInn,
          bankBik: branchData.isMain ? orgData.bankBik : branchData.bankBik,
          bankKs: branchData.isMain ? orgData.bankKs : branchData.bankKs,
          bankRs: branchData.isMain ? orgData.bankRs : branchData.bankRs,
        },
        {
          transaction,
        },
      );
      branches.push(branch);
    }

    let orgSeller: OrganizationSeller = null;
    const sellerUserId = authUserRole.role.label === 'seller' ? authUser.id : sellerData?.userId;
    if (!!sellerUserId) {
      const confirmationDate =
        authUserRole.role.label === 'seller' && !!authUser.sellerConfirmationDate ? new Date() : null;
      // If user provides additional org branch he should be attached to non main branch
      const branch = branches.length > 1 ? branches.find(el => !el.isMain) : branches[0];
      if (!!authUser.sellerConfirmationDate) {
        orgSeller = await OrganizationSeller.create(
          {
            organizationId: org.id,
            userId: sellerUserId,
            branchId: branch.id,
            confirmationDate: ['manager', 'operator'].includes(authUserRole?.role?.label)
              ? new Date()
              : confirmationDate,
          },
          {
            transaction,
          },
        );
      } else {
        await User.update(
          {
            sellerRegisterOrganizationId: org.id,
            sellerRegisterOrganizationBranchId: branch.id,
          },
          {
            where: { id: authUser.id },
            transaction,
          },
        );
      }
    }

    if (!!io) {
      await createNotificationForAllManagersService({
        type:
          authUserRole.role.label === 'seller'
            ? ENotificationType.registerOrganizationApplication
            : ENotificationType.dummy,
        autoread: false,
        organizationId: org.id,
        data: {
          organization: {
            id: org.id,
            name: getOrgName(org, true, true),
          },
        },
        io,
        transaction,
      });
    }

    return {
      org,
      orgSeller,
      branches,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при создании организации',
      error: err,
    });
  }
};
