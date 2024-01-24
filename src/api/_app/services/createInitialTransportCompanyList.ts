import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import TransportCompany from '../../shipping/models/TransportCompany';
import { TRANSPORT_COMPANIES_LIST } from '../../shipping/data';
import { APIError } from '../../../utils/api.utils';

type IProps = {
  res: Response;
  transaction: Transaction;
};

interface IResult {
  transportCompanies: TransportCompany[];
}

export const createInitialTransportCompaniesService = async ({ res, transaction }: IProps): Promise<IResult> => {
  try {
    for (const transportCompany of TRANSPORT_COMPANIES_LIST) {
      await TransportCompany.create(transportCompany, { transaction });
    }

    const transportCompanies = await TransportCompany.findAll({ transaction });

    return {
      transportCompanies,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while creating transport companies',
      error: err,
      strict: true,
    });
  }
};
