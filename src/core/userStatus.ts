import Redis, { Redis as IRedis } from 'ioredis';
import { Socket } from 'socket.io';
import { REDIS_URL } from '../config/env';

/**
 * @class UserStatus
 * @description A class user status controller. Save data with redis.
 * @param {*} { actionType: string }
 */
class UserStatus {
  redis: IRedis;
  usersKey: string;
  actionType: string;

  constructor({ actionType }: { actionType: string }) {
    this.redis = new Redis(REDIS_URL);
    this.usersKey = 'users';
    this.actionType = actionType;
  }

  /**
   * @description Send active users array to the client;
   * @param {Socket} socket
   * @memberof UserStatus
   */
  async setUsersServerData(socket: Socket) {
    const users = await this.getUsers();
    socket.broadcast.emit(this.actionType, users);
  }

  /**
   * @description Get all active users, array (hash keys).
   * @returns {Promise<string[]>} active users array.
   * @memberof UserStatus
   */
  public async getUsers(): Promise<string[]> {
    const result = await this.redis.hkeys(this.usersKey);
    return result;
  }

  /**
   * @description Get uniq user from redis key/value db, by socket.id
   * @param {string} id
   * @returns {Promise<string>}
   * @memberof UserStatus
   */
  public async getUserBySocketId(id: string): Promise<string> {
    const userKeys = await this.redis.keys(`${id}*`);
    const user = await this.redis.get(userKeys?.[0]);
    return user;
  }

  public async getUserById(userId: string): Promise<string> {
    const user = await this.redis.hget(this.usersKey, userId);
    return user;
  }

  /**
   * @description Set (userId/socketId) to the redis hash list, make support write to the redis key/value db (socketId/userId).
   * @param {string} userId
   * @param {Socket} socket
   * @returns {Promise<string>} userId.
   * @memberof UserStatus
   */
  async setUser(userId: string, socket: Socket): Promise<string> {
    const userKeys = await this.redis.keys(`*${userId}`);
    for (const key of userKeys) {
      await this.redis.del(key);
    }

    const user = await this.getUserBySocketId(socket.id);
    if (!user) {
      await this.redis.hset(this.usersKey, userId, socket.id);
      await this.redis.set(`${socket.id} ${userId}`, userId);
      this.setUsersServerData(socket);
    }
    return user;
  }

  /**
   * @description Remove (userId/socketId) from the redis hash list and the (socketId/userId) from the redis key/value db.
   * @param {Socket} socket
   * @returns {Promise<boolean>}
   * @memberof UserStatus
   */
  async removeUser(socket: Socket): Promise<boolean> {
    const user = await this.getUserBySocketId(socket.id);
    socket.leave(user);

    const userKeys = await this.redis.keys(`${socket.id}*`);
    for (const key of userKeys) {
      await this.redis.del(key);
    }
    await this.redis.hdel(this.usersKey, user);
    await this.setUsersServerData(socket);
    console.log('User disconnected', user);
    return true;
  }
}

export const usersOnlineStatus = new UserStatus({ actionType: 'SERVER:ONLINE_STATUS' });

export { UserStatus };
