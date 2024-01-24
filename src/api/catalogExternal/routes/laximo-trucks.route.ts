import { Router } from 'express';
import Laximo from '../controllers/laximo.ctrl';
import { LAXIMO_TRUCKS_BASE_URL } from '../../../config/env';

const router = Router();

const laximoTrucksCtrl = new Laximo(LAXIMO_TRUCKS_BASE_URL);


router.route('/brands').get(laximoTrucksCtrl.getCatalogAll);
router.route('/catalog-info').get(laximoTrucksCtrl.getCatalogInfo);

router.route('/car-by-vin-or-frame').get(laximoTrucksCtrl.getCarByVinOrFrame);
router.route('/wizards').get(laximoTrucksCtrl.getWizardByCatalogCode);
router.route('/wizards-next').get(laximoTrucksCtrl.getWizardByCatalogCodeAndSsd);
router.route('/cars-by-wizard').get(laximoTrucksCtrl.getCarsByWizardSsd);
router.route('/cars-by-oem').get(laximoTrucksCtrl.getCarsByOem);
router.route('/cars-by-chassis').get(laximoTrucksCtrl.getCarsByChassisNumber);

router.route('/car-info').get(laximoTrucksCtrl.getCarInfo);
router.route('/car-info-groups').get(laximoTrucksCtrl.getCarInfoByGroups);
router.route('/car-info-units').get(laximoTrucksCtrl.getCarInfoByNodes);
router.route('/unit-info-in-group').get(laximoTrucksCtrl.getQuickListDetails);

router.route('/unit-by-oem').get(laximoTrucksCtrl.getOEMPartApplicability);
router.route('/details').get(laximoTrucksCtrl.getDetailsListInUnit);

export default router;