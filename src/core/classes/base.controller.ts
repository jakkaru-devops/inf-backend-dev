import { SocketServer } from '../socket';

export abstract class BaseController {
  io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }
}
