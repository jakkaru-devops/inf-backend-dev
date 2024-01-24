import { Router } from 'express';

export const createRouter = (routes: Array<[string, Router]>) => {
  const router = Router();
  for (const route of routes) {
    router.use(route[0], route[1]);
  }
  return router;
};
