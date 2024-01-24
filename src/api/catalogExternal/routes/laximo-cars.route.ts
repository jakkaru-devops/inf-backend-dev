import { Router } from 'express';
import Laximo from '../controllers/laximo.ctrl';
import { LAXIMO_CARS_BASE_URL } from '../../../config/env';

const router = Router();

const laximoCarsCtrl = new Laximo(LAXIMO_CARS_BASE_URL);

router.route('/brands').get(laximoCarsCtrl.getCatalogAll);
router.route('/catalog-info').get(laximoCarsCtrl.getCatalogInfo);

router.route('/car-by-vin-or-frame').get(laximoCarsCtrl.getCarByVinOrFrame);
router.route('/wizards').get(laximoCarsCtrl.getWizardByCatalogCode);
router.route('/wizards-next').get(laximoCarsCtrl.getWizardByCatalogCodeAndSsd);
router.route('/cars-by-wizard').get(laximoCarsCtrl.getCarsByWizardSsd);
router.route('/cars-by-oem').get(laximoCarsCtrl.getCarsByOem);
router.route('/cars-by-chassis').get(laximoCarsCtrl.getCarsByChassisNumber);

router.route('/car-info').get(laximoCarsCtrl.getCarInfo);
router.route('/car-info-groups').get(laximoCarsCtrl.getCarInfoByGroups);
router.route('/car-info-units').get(laximoCarsCtrl.getCarInfoByNodes);
router.route('/unit-info-in-group').get(laximoCarsCtrl.getQuickListDetails);

router.route('/unit-by-oem').get(laximoCarsCtrl.getOEMPartApplicability);
router.route('/details').get(laximoCarsCtrl.getDetailsListInUnit);

export default router;