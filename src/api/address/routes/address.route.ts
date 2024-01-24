import { Router } from 'express';
import AddressCtrl from '../controllers/address.ctrl';

const router = Router();
const addressCtrl = new AddressCtrl();

router.route('/suggestions').post(addressCtrl.getAddressSuggestions);

export default router;
