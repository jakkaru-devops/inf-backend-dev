import { Router } from 'express';

import FilesCtrl from './files.ctrl';

const filesCtrl = new FilesCtrl();
const router = Router();

router.route('/list').get(filesCtrl.getFileList);

router.route('/unknown').post(filesCtrl.uploadUnknownFile).delete(filesCtrl.dropUnknownFile);

export default router;
