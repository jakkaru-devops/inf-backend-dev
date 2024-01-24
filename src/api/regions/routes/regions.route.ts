import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth.mw';
import RegionsCtrl from '../controllers/regions.ctrl';

const router = Router();
const regionsCtrl = new RegionsCtrl();

router.route('/').get(regionsCtrl.getRegions);
router.route('/:parentguid').get(regionsCtrl.getSettlements);
router
  .route('/selected/list')
  .get(requireAuth, regionsCtrl.getSelectedRegionsSettlements)
  .post(requireAuth, regionsCtrl.setSelectedRegionsSettlements);

export default router;
