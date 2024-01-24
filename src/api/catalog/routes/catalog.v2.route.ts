import { Router } from 'express';
import CatalogV2Controller from '../controllers/catalog.v2.controller';
import { SocketServer } from '../../../core/socket';
import { requireAuth } from '../../../middlewares/auth.mw';

export const catalogV2Router = (io: SocketServer) => {
  const catalogV2Controller = new CatalogV2Controller();
  const router = Router();

  router.route('/auto-types').get(catalogV2Controller.getAutoTypeList);

  router.route('/auto-brands').get(catalogV2Controller.getAutoBrandList);

  router.route('/groups').get(catalogV2Controller.getGroupList);

  router.route('/products/:id/prices').get(catalogV2Controller.getProductPrices);

  router.route('/suppliers-by-product/:productId').get(catalogV2Controller.getSuppliersByProduct);

  router
    .route('/sale-products')
    .get(requireAuth, catalogV2Controller.getSaleProductList)
    .post(requireAuth, catalogV2Controller.createSaleProduct);

  router
    .route('/sale-products/:saleId')
    .get(requireAuth, catalogV2Controller.getSaleProduct)
    .put(requireAuth, catalogV2Controller.updateSaleProduct)
    .delete(requireAuth, catalogV2Controller.deleteSaleProduct);

  return router;
};
