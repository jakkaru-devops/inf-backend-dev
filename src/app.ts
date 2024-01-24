require('dotenv').config();

import express from 'express';
import http from 'http';
import morgan from 'morgan';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import swaggerUi from 'swagger-ui-express';
import cron from 'node-cron';
import cluster from 'cluster';
import { cpus } from 'os';
import { setupMaster } from '@socket.io/sticky';
import { setupPrimary } from '@socket.io/cluster-adapter';

import DBConnection from './config/db';
import { CLUSTER_MODE, PORT } from './config/env';
import * as error from './middlewares/error.mw';
import createSocket from './core/socket';
import SWAGGER_JSON from '../swagger.json';

import { getAndUpdateExpiredOffersService } from './api/order/services/getAndUpdateExpiredOffers';
import { getAndUpdateRewardsGivenAtService } from './api/order/services/getAndUpdateRewardsGivenAt.service';
import { createMainRouter, createV2Router } from './routes';
import { getUnreadEmails } from './utils/acceptingApplicationsByEmail';

const numCPUs = CLUSTER_MODE ? cpus().length : 1;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  // Http server and Sockets
  const app = express();
  const httpServer = http.createServer(app);

  if (CLUSTER_MODE) {
    // setup sticky sessions
    setupMaster(httpServer, {
      loadBalancingMethod: 'least-connection',
    });

    // setup connections between the workers
    setupPrimary();

    // needed for packets containing buffers (you can ignore it if you only send plaintext objects)
    // Node.js < 16.0.0
    (cluster as any).setupMaster({
      serialization: 'advanced',
    });
    // Node.js > 16.0.0
    // cluster.setupPrimary({
    //   serialization: "advanced",
    // });
  }

  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Handle worker online event
  cluster.on('online', (worker) => {
    console.log(`Worker ${worker.process.pid} is online`);
  });

  // Handle worker exit event
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    // Restart the worker
    cluster.fork();
  });
} else {
  const app = express();

  app.enable('trust proxy');

  // Cors settings
  app.use(
    cors({
      origin: '*',
      allowedHeaders: '*',
    })
  );

  // File upload
  app.use(fileUpload({}));

  // Logger
  app.use(morgan('dev'));

  // Body parser
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: false, limit: '50mb' }));

  // Uploads. Must be below the body parser
  app.use(express.static('uploads'));

  // DB init
  DBConnection.authenticate()
    .then(() => console.log('Connection to the database has been established successfully'))
    .catch((err) => console.error(`Unable to connect to the database: ${err}`));
  DBConnection.sync();

  // Http server and Sockets
  const httpServer = http.createServer(app);
  const io = createSocket(httpServer);

  if (cluster.worker.id === 1) {
    // Run cron only once
    cron.schedule('*/5 * * * *', async () => {
      await getAndUpdateExpiredOffersService(io);
      await getAndUpdateRewardsGivenAtService();
      await getUnreadEmails(io);
    });
    console.log(`Cron job is active`);
  }

  // Routes
  app.use('/api', createMainRouter(io));
  app.use('/api/v2', createV2Router(io));

  // Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(SWAGGER_JSON));

  // Errors
  app.use(error.notFound);

  // Run server
  httpServer.listen(PORT, () => console.log(`Worker ${process.pid} started and listening on port ${PORT}`));
}
