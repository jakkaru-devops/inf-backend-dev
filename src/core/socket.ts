import { Server as SocketServer, Socket } from 'socket.io';
import { setupMaster, setupWorker } from '@socket.io/sticky';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';
import http from 'http';
import { usersOnlineStatus, UserStatus } from './userStatus';
import { CLUSTER_MODE, ENV } from '../config/env';

const createSocket = (http: http.Server) => {
  const io = new SocketServer(http, {
    cors: {
      origin: '*',
      allowedHeaders: '*',
    },
    transports: ['websocket', 'polling'],
  });

  if (CLUSTER_MODE) {
    // use the cluster adapter
    io.adapter(createAdapter() as any);

    // setup connection with the primary process
    setupWorker(io);
  }

  io.on('connection', (socket: Socket) => {
    console.log('New socket user', socket.id);

    socket.on('disconnect', () => {
      usersOnlineStatus.removeUser(socket);
    });

    socket.on('CLIENT:USER_CONNECTED', (userId: string) => {
      console.log('User connected with id', userId);
      socket.join(userId);
      usersOnlineStatus.setUser(userId, socket);
    });

    socket.on('CLIENT:CHAT_TYPING', (data: any) => {
      socket.broadcast.emit('SERVER:CHAT_TYPING', data);
    });
  });

  return io;
};

export { SocketServer };

export default createSocket;
