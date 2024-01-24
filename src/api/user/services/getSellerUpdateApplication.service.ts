import { Response } from 'express';
import httpStatus from 'http-status';
import seq, { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import Address from '../../address/models/Address.model';
import FileModel from '../../files/models/File.model';
import SellerUpdateApplication from '../models/SellerUpdateApplication.model';
import SellerUpdateApplicationFile from '../models/SellerUpdateApplicationFile.model';

interface IProps {
  userId: string;
  status?: 'any';
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  sellerUpdateApplication: SellerUpdateApplication;
}

export const getSellerUpdateApplicationService = async ({
  userId,
  status,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const where: seq.WhereOptions = {
      userId,
    };
    if (!status || status !== 'any') {
      where.confirmedAt = null;
      where.rejectedAt = null;
    }

    const application = await SellerUpdateApplication.findOne({
      where,
      order: [['createdAt', 'DESC']], // get the last application
      include: [
        {
          model: Address,
          as: 'address',
        },
        {
          model: SellerUpdateApplicationFile,
          as: 'files',
          include: [
            {
              model: FileModel,
              as: 'file',
            },
          ],
        },
      ],
      transaction,
    });

    if (!application)
      return {
        sellerUpdateApplication: null,
      };

    return {
      sellerUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных не загружена',
      error: err,
    });
  }
};
