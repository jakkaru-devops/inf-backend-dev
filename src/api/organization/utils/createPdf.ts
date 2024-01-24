import { UPLOAD_FILES_DIRECTORY, UPLOADS_DATE_FORMAT } from '../../../config/env';
import formatDate from 'date-fns/format';

export const getOrgDirectoryPath = (orgId: string, type: 'actual' | 'db') =>
  (type === 'actual' ? UPLOAD_FILES_DIRECTORY : ``) +
  `organization/${orgId}/${formatDate(new Date(), UPLOADS_DATE_FORMAT)}`;
