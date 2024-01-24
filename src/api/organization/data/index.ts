import fs from 'fs';
import path from 'path';
import appRoot from 'app-root-path';
import { IOrganizationEntityType } from '../interfaces';

export const ORGANIZATION_MIN_DISCOUNT_PERCENT = 6;

export const ORG_ENTITY_TYPES = JSON.parse(
  // fs.readFileSync(path.join('./orgTypes.json')) as any,
  fs.readFileSync(path.join(appRoot + '/src/api/organization/data/orgTypes.json')) as any,
) as IOrganizationEntityType[];

export const SERVICE_ORGANIZATION_INN = '3801147025';
