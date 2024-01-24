import { Transaction } from 'sequelize';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import { ICreateProductAnalogDto } from '../interfaces/dto';
import httpStatus from 'http-status';
import ProductAnalogs from '../models/ProductAnalogs.model';

export interface ICreateProductAnalogServiceProps {
  productId: string;
  analogId: string;
  transaction: Transaction;
}

export interface ICreateProductAnalogServiceResult {
  productAnalogs: ProductAnalogs[];
}

export const createProductAnalogService = async ({
  productId,
  analogId,
  transaction,
}: ICreateProductAnalogServiceProps): Promise<IServiceResponse<ICreateProductAnalogServiceResult>> => {
  try {
    const createProductAnalog: ICreateProductAnalogDto = {
      productId,
      analogId,
    };

    const productAnalog1 = await ProductAnalogs.create(createProductAnalog, {
      transaction,
    });

    return {
      result: {
        productAnalogs: [productAnalog1],
      },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error while creating product analog',
        error: err,
      },
    };
  }
};
