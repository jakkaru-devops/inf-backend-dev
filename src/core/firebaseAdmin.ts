import firebaseAdmin from 'firebase-admin';
import appRoot from 'app-root-path';
import fs from 'fs';
import path from 'path';
import { SEND_PUSH_NOTIFICATIONS } from '../config/env';

if (SEND_PUSH_NOTIFICATIONS) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(path.join(appRoot + '/firebase-private-key.json')) as any,
  ) as object;

  firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
  });
}

export { firebaseAdmin };
