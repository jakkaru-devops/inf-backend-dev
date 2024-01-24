import { Router } from 'express';
import { getUserLanguage } from '../../middlewares/language.mw';
import LanguagesCtrl from './controllers/language.ctrl';

const languagesCtrl = new LanguagesCtrl();
const router = Router();

router.route('/list').get(getUserLanguage, languagesCtrl.getList);

export default router;
