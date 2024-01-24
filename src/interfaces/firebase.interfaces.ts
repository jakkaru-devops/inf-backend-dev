export interface IFCM {
  send: (message: IFCMMessage, callback: IFCMCallback) => void;
  sendToMultipleToken: (message: IFCMMessage, tokens: string[], callback: IFCMCallback) => void;
}

export interface IFCMMessage {
  data: any;
  notification: {
    title: string;
    body: string;
  };
  token?: string;
}

export type IFCMCallback = (err: any, response: any) => void;
