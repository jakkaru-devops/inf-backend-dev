import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import fs from 'fs';
import path from 'path';
import appRoot from 'app-root-path';
import parse from 'csv-parse';
import Region from '../../regions/models/Region.model';
import SettlementType from '../../regions/models/SettlementType.model';
import { APIError } from '../../../utils/api.utils';

type IProps = {
  res: Response;
  transaction: Transaction;
};

type IResult = {
  success: boolean;
};

export const createInitialAddressesService = async ({ res, transaction }: IProps): Promise<IResult> => {
  try {
    // Settlement types
    await parseAndImportTable({
      filePath: '/_init/fias/settlementTypes.txt',
      model: SettlementType,
      errorMessage: 'An error has occured while importing settlement types from csv',
      res,
      transaction,
    });

    // Regions
    await parseAndImportTable({
      filePath: '/_init/fias/regions.txt',
      model: Region,
      errorMessage: 'An error has occured while importing regions from csv',
      res,
      transaction,
    });

    return {
      success: true,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while importing fias addresses',
      error: err,
      strict: true,
    });
  }
};

const parseAndImportTable = async ({
  filePath,
  model,
  errorMessage,
  res,
  transaction,
}: {
  filePath: string;
  model: any;
  errorMessage: string;
  res: Response;
  transaction: Transaction;
}): Promise<void> => {
  try {
    return new Promise((resolve, reject) => {
      const stream = fs.createReadStream(path.join(appRoot + filePath), {
        encoding: 'utf-8',
      });
      const parser = parse({
        delimiter: ',',
        columns: Object.keys(model.rawAttributes),
        quote: '"',
        escape: "'",
      });
      let rows = [];

      stream.on('ready', () => {
        stream.pipe(parser);
      });

      parser.on('readable', async function () {
        let row: any;
        while ((row = parser.read())) {
          rows.push(row);
        }
      });

      parser.on('error', function (err) {
        console.error(err.message);
        reject({
          error: null,
        });
      });

      parser.on('end', async () => {
        console.log('Parsing complete');
        await model.bulkCreate(rows, {
          transaction,
        });
        resolve();
      });
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: errorMessage,
      error: err,
      strict: true,
    });
  }
};
