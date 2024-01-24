import { SocketServer } from './core/socket';
import { createRouter } from './core/utils/createRouter';

import _appRouter from './api/_app/route';
import authRouter from './api/auth/route';
import userRouter from './api/user/routes/user.route';
import regionsRouter from './api/regions/routes/regions.route';
import roleRouter from './api/role/route';
import organizationRouter from './api/organization/routes/organization.route';
import addressRouter from './api/address/routes/address.route';
import paymentRouter from './api/payment/route';
import catalogRouter from './api/catalog/routes/catalog.route';
import orderRouter from './api/order/routes/orders.route';
import chatRouter from './api/messenger/routes/chat.route';
import fileRouter from './api/files/files.route';
import languageRouter from './api/language/route';
import shippingRouter from './api/shipping/route';
import catalogExternalRouter from './api/catalogExternal/route';
import notificationRouter from './api/notification/route/notification.route';

import { profileV2Router } from './api/user/routes/profile.route';
import { catalogV2Router } from './api/catalog/routes/catalog.v2.route';
import { ordersV2Router } from './api/order/routes/orders.v2.router';
import { cartRouter } from './api/cart/routes/cart.router';
import { statisticsRouter } from './api/statistics/routes/statistics.router';

export const createMainRouter = (io: SocketServer) =>
  createRouter([
    ['/_app', _appRouter],
    ['/auth', authRouter(io)],
    ['/user', userRouter(io)],
    ['/regions', regionsRouter],
    ['/role', roleRouter(io)],
    ['/organization', organizationRouter(io)],
    ['/address', addressRouter],
    ['/payment', paymentRouter(io)],
    ['/catalog', catalogRouter(io)],
    ['/order', orderRouter(io)],
    ['/chat', chatRouter(io)],
    ['/notification', notificationRouter(io)],
    ['/file', fileRouter],
    ['/language', languageRouter],
    ['/shipping', shippingRouter],
    ['/catalog/external', catalogExternalRouter],
  ]);

export const createV2Router = (io: SocketServer) =>
  createRouter([
    ['/profile', profileV2Router(io)],
    ['/catalog', catalogV2Router(io)],
    ['/orders', ordersV2Router(io)],
    ['/cart', cartRouter(io)],
    ['/statistics', statisticsRouter()],
  ]);
