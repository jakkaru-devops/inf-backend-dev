import { DEFAULT_AUTO_TYPES } from '../../catalog/data';
import { LAXIMO_TRUCKS_BASE_URL } from '../../../config/env';

export const URL_ACAT = 'https://84.201.129.92/api/catalogs';
export const URL_ACAT_V2 = 'https://84.201.129.92/api2/catalogs';

export const LAXIMO_API_URLS = {
  ALL_CATALOGS: `${LAXIMO_TRUCKS_BASE_URL}/catalog/all`,
  CATALOG_INFO: `${LAXIMO_TRUCKS_BASE_URL}/catalog`,
  CAR_INFO_BY_VIN_OR_FRAME: `${LAXIMO_TRUCKS_BASE_URL}/car/vinOrFrame`,
  WIZARD_IN_CATALOG: `${LAXIMO_TRUCKS_BASE_URL}/car/wizard/catalog`,
  CARS_BY_WIZARD: `${LAXIMO_TRUCKS_BASE_URL}/car/vehicleByWizard/catalog`,
};

export const ACAT_AUTO_TYPES = [
  { acat: 'CARS_NATIVE', ...DEFAULT_AUTO_TYPES[0] },
  { acat: 'CARS_FOREIGN', ...DEFAULT_AUTO_TYPES[0] },
  { acat: 'TRUCKS_NATIVE', ...DEFAULT_AUTO_TYPES[1] },
  { acat: 'TRUCKS_FOREIGN', ...DEFAULT_AUTO_TYPES[1] },
  { acat: 'SPECIAL_TECH_NATIVE', ...DEFAULT_AUTO_TYPES[3] },
  { acat: 'SPECIAL_TECH_FOREIGN', ...DEFAULT_AUTO_TYPES[3] },
  { acat: 'BUS', ...DEFAULT_AUTO_TYPES[4] },
  { acat: 'MOTORCYCLE', ...DEFAULT_AUTO_TYPES[5] },
  { acat: 'ENGINE', ...DEFAULT_AUTO_TYPES[6] },
];
