import { Response } from 'express';
import { Transaction } from 'sequelize';

export type IEntityId = number | string;

/**
 * Used as options for all services without DB update operations
 */
export interface IGetterServiceParams {
  limit?: number;
  offset?: number;
  transaction?: Transaction;
}

export interface RandomCodeType {
  length: number;
  numbers?: boolean;
  symbols?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
  excludeSimilarCharacters?: boolean;
}

export interface IServiceError {
  status: number;
  message: string;
  error?: any;
}

export interface IServiceResponse<T> {
  result?: T;
  error?: IServiceError;
}

export interface IAPIError extends IServiceError {
  res: Response;
}

export interface IAPIResponse {
  res: Response;
  data?: any;
}

export interface ILocale {
  language: string;
  name: string;
  nameAlt?: string;
  description?: string;
}

export type IFrontendPlatform = 'web' | 'android' | 'ios';

export interface IPaginationParams {
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}
