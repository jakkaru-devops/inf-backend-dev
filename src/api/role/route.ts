import { Router } from 'express';
import SocketIO from 'socket.io';
import { requirePermissions } from '../../middlewares/auth.mw';
import RoleCtrl from './ctrl';

const roleRouter = (io: SocketIO.Server) => {
  const router = Router();
  const roleCtrl = new RoleCtrl(io);

  router
    .route('/')
    .get(requirePermissions('manageRolesAvailable'), roleCtrl.getRoles)
    .post(requirePermissions('manageRolesAvailable'), roleCtrl.createRole);

  router
    .route('/:id')
    .get(requirePermissions('manageRolesAvailable'), roleCtrl.getRoleById)
    .put(requirePermissions('manageRolesAvailable'), roleCtrl.updateRole)
    .delete(requirePermissions('manageRolesAvailable'), roleCtrl.destroyRole);

  return router;
};

export default roleRouter;
