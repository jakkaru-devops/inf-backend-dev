import { Response } from 'express';
import httpStatus from 'http-status';
import { ServiceErrorName } from '../core/data/core.data';

interface IAPIResponse {
  res: Response;
  data?: any;
}

export const APIResponse = ({ res, data = null }: IAPIResponse) => {
  return res.status(httpStatus.OK).json({
    status: httpStatus.OK,
    data,
  });
};

interface IAPIError {
  res: Response;
  status: number;
  message: string;
  error?: Error;
  strict?: boolean;
}

export const APIError = ({ res, status, message, error = null, strict }: IAPIError) => {
  if (error) {
    const isServiceError = error?.name === ServiceErrorName;

    if (isServiceError) {
      const errorData: { status: number; message: string } = JSON.parse(error.message);
      status = errorData.status;
      message = errorData.message;
    }

    console.log('APIError: ' + message + ' ' + error);
  }

  const result: any = { message };
  if (!strict) result.status = status;
  return res.status(strict ? status : httpStatus.OK).json(result);
};
