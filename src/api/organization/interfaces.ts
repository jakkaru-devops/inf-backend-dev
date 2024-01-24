import { IAddress } from '../address/interfaces';
import Organization from './models/Organization.model';
import OrganizationBranch from './models/OrganizationBranch.model';

export interface IOrganization extends Organization {
  status: {
    label: string;
    name: string;
  };
}

export interface IOrganizationByInn {
  id?: string;
  isRegistered?: boolean;
  entityCode: string;
  entityType: string;
  inn: string;
  kpp: string;
  ogrn?: string;
  name?: string;
  pureName?: string;
  shopName?: string;
  priceBenefitPercent?: number;
  priceBenefitPercentAcquiring?: number;
  priceBenefitPercentInvoice?: number;
  branches?: OrganizationBranch[];
  directorFirstname?: string;
  directorLastname?: string;
  directorMiddlename?: string;
  juristicAddress?: IAddress;
  actualAddress?: IAddress;
  mailingAddress?: IAddress;
  bankName?: string;
  bankInn?: string;
  bankBik?: string;
  bankKs?: string;
  bankRs?: string;
  hasNds?: boolean;
  authUserIsBeingSeller?: boolean;
  isServiceOrganization?: boolean;
}

export interface IOrganizationEntityType {
  globalId: number;
  code: string;
  name: {
    full?: string;
    short?: string;
  };
}

export interface IOrganizationInfo {
  inn: string;
  orgnLabel: string;
  ogrn: string;
  kpp?: string;
  orgNameLabel: string;
  orgName?: string;
  shopName?: string;
  email?: string;
  directorLabel?: string;
  directorFirstname?: string;
  directorLastname?: string;
  directorMiddlename?: string;
  juristicAddressCountry?: string;
  juristicAddressRegion?: string;
  juristicAddressSettlement?: string;
  juristicAddressStreet?: string;
  juristicAddressBuilding?: string;
  juristicAddressApartment?: string;
  mailingAddressCountry?: string;
  mailingAddressRegion?: string;
  mailingAddressSettlement?: string;
  mailingAddressStreet?: string;
  mailingAddressBuilding?: string;
  mailingAddressApartment?: string;
  actualAddressCountry?: string;
  actualAddressRegion?: string;
  actualAddressSettlement?: string;
  actualAddressStreet?: string;
  actualAddressBuilding?: string;
  actualAddressApartment?: string;
  organizationNds?: string;
  bankName?: string;
  bankInn?: string;
  bankBik?: string;
  bankKs?: string;
  bankRs?: string;
}

export interface IOrganizationData extends IOrganization {
  branchId?: string;
  branchKpp?: string;
  branchBankName?: string;
  branchBankInn?: string;
  branchBankBik?: string;
  branchBankKs?: string;
  branchBankRs?: string;
  branchAddress?: IAddress;
}
