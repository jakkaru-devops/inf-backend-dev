import { Response } from 'express';
import NodeCache from 'node-cache';
import axios, { AxiosResponse, Method } from 'axios';
import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';
import md5 from 'md5';

export class OnlineCheckClient {
  private readonly res: Response;
  private readonly account: string;
  private token: string;
  private readonly appId: any;
  private readonly secret: string | boolean;
  private readonly nonce: string | boolean;
  private cache: NodeCache;

  constructor(account, appId, secret, res: Response) {
    this.account = account;
    this.appId = appId;
    this.secret = secret;
    this.nonce = `nonce_${process.hrtime()[1]}`;
    this.cache = new NodeCache();
    this.res = res;
  }

  async request(method: Method, model: string, params = {}): Promise<AxiosResponse> {
    const response = await this.sendRequest(method, model, params);

    const statusCode = response.status;
    const resInstance = this.res;
    switch (statusCode) {
      case httpStatus.BAD_REQUEST:
        throw APIError({
          res: resInstance,
          status: httpStatus.BAD_REQUEST,
          message: `Ошибка при выполнение запроса ${response.data}`,
        });
      case httpStatus.UNAUTHORIZED:
        throw APIError({
          res: resInstance,
          status: httpStatus.UNAUTHORIZED,
          message: `Ошибка при выполнение запроса ${response.data.message}`,
        });

      case httpStatus.INTERNAL_SERVER_ERROR:
        throw APIError({
          res: resInstance,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: `Ошибка при выполнение запроса ${response.data.message}`,
        });

      default:
        return response;
    }
  }

  public getStateSystem() {
    return this.request('GET', 'StateSystem', { app_id: this.appId, nonce: this.nonce, token: this.token });
  }

  public getShiftInfo() {
    return this.request('GET', 'Shift', { app_id: this.appId, nonce: this.nonce, token: this.token });
  }

  public openShift(commandName = 'name') {
    return this.request('POST', 'Command', {
      app_id: this.appId,
      command: { report_type: false, author: commandName },
      nonce: this.nonce,
      token: this.token,
      type: 'openShift',
    });
  }

  public closeShift(commandName = 'name') {
    return this.request('POST', 'Command', {
      app_id: this.appId,
      command: { report_type: false, author: commandName },
      nonce: this.nonce,
      token: this.token,
      type: 'closeShift',
    });
  }

  public sendCheck(command: {}) {
    return this.request('POST', 'Command', {
      app_id: this.appId,
      command: command,
      nonce: this.nonce,
      token: this.token,
      type: 'printCheck',
    });
  }

  public getPurchaseReturn(command: {}) {
    return this.request('POST', 'Command', {
      app_id: this.appId,
      command: command,
      nonce: this.nonce,
      token: this.token,
      type: 'printPurchaseReturn',
    });
  }

  public dataCommandId(commandId: string) {
    return this.request('GET', `Command/${commandId}`, {
      nonce: `nonce_${new Date().getTime()}`,
      token: this.token,
      app_id: this.appId,
    });
  }

  async getNewToken() {
    const data = await this.request('GET', 'Token', { app_id: this.appId, nonce: this.nonce });
    this.token = data.data.token;
    return this.token;
  }

  sendRequest(method: Method, model: string, params: {}): Promise<AxiosResponse> {
    let url = `${this.account}${model}`;
    let config: {};

    if (method === 'GET') {
      config = {
        method,
        url,
        headers: { sign: this.getSign(params) },
        params: { ...params },
      };
    } else {
      config = { method, url, headers: { sign: this.getSign(params) }, data: { ...params } };
    }
    return axios(config);
  }

  private getSign(params) {
    const obj = Object.keys(params)
      .sort()
      .reduce((r, k) => ((r[k] = params[k]), r), {});
    return md5(`${JSON.stringify(obj)}${this.secret}`);
  }
}
