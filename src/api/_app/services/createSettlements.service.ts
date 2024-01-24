import { Response } from 'express';
import Settlement from '../../regions/models/Settlement.model';
import parse from 'csv-parse';
import path from 'path';
import appRoot from 'app-root-path';
import fs from 'fs';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';

interface IProps {
  res: Response;
  transaction: Transaction;
}

export const createSettlements = async ({ res, transaction }: IProps): Promise<void> => {
  try {
    const readingFile = async ({
      filePath,
      model,
      errorMessage,
    }: {
      filePath: string;
      model: any;
      errorMessage: string;
    }) => {
      try {
        const rows = [];
        const parser = fs
          .createReadStream(path.join(appRoot + filePath), {
            encoding: 'utf-8',
          })
          .pipe(
            parse({
              delimiter: ',',
              columns: Object.keys(model.rawAttributes),
              quote: '"',
              escape: "'",
            }),
          );

        for await (const row of parser) {
          rows.push({
            areacode: row.areacode,
            autocode: row.autocode,
            citycode: row.citycode,
            code: row.code,
            enddate: row.enddate,
            formalname: row.formalname,
            ifnsfl: row.ifnsfl,
            ifnsul: row.ifnsul,
            offname: row.offname,
            okato: row.okato,
            oktmo: row.oktmo,
            placecode: row.placecode,
            plaincode: row.plaincode,
            postalcode: row.postalcode,
            regioncode: row.regioncode,
            shortname: row.shortname,
            startdate: row.startdate,
            streetcode: row.streetcode,
            terrifnsfl: row.terrifnsfl,
            terrifnsul: row.terrifnsul,
            updatedate: row.updatedate,
            ctarcode: row.ctarcode,
            extrcode: row.extrcode,
            sextcode: row.sextcode,
            plancode: row.plancode,
            cadnum: row.cadnum,
            divtype: row.divtype,
            actstatus: Number(row.actstatus),
            aoguid: row.aoguid,
            aoid: row.aoid,
            aolevel: Number(row.aolevel),
            centstatus: Number(row.centstatus),
            currstatus: Number(row.currstatus),
            livestatus: Number(row.livestatus),
            nextid: row.nextid,
            normdoc: row.normdoc,
            operstatus: Number(row.operstatus),
            parentguid: row.parentguid,
            previd: row.previd,
          });
        }
        await model.bulkCreate(rows);
      } catch (e) {
        throw new Error(errorMessage);
      }
    };

    const innitialAddress = async () => {
      const path = [
        '/_init/fias/sett/sett.txt',
        '/_init/fias/sett/sett1.txt',
        '/_init/fias/sett/sett2.txt',
        '/_init/fias/sett/sett3.txt',
      ];

      for (const filePath of path) {
        if (filePath) {
          await readingFile({
            filePath,
            model: Settlement,
            errorMessage: 'An error has occured while importing settlements from csv',
          });
        }
      }
    };

    await innitialAddress();
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error occurred when creating settlements',
      error: err,
      strict: true,
    });
  }
};
