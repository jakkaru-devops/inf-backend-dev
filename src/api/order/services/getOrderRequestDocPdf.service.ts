import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';
import SelectedRegions from '../../regions/models/SelectedRegions.model';
import UserRoles from '../../role/models/UserRoles.model';
import { getOrderRequestService } from './getOrderRequest.service';
import seq from 'sequelize';
import Region from '../../regions/models/Region.model';
import User from '../../user/models/User.model';
import ExcelJS from 'exceljs';
import { convertAddressToString, getUserName, stripString } from '../../../utils/common.utils';
import formatDate from 'date-fns/format';
import { EXCEL_COL_STYLE } from '../data';
import RequestProduct from '../models/RequestProduct.model';
import OrderRequest from '../models/OrderRequest.model';
import { generatePdfFromTemplate } from '../../../utils/pdf.utils';
import { IOrderRequestDocData } from '../interfaces';

interface IProps {
  res: Response;
  authUserRole: UserRoles;
  data: IOrderRequestDocData;
}

interface IResult {
  buffer: ExcelJS.Buffer;
  filename: string;
}

export const getOrderRequestDocPdfService = async ({ res, authUserRole, data }: IProps): Promise<IResult> => {
  try {
    const filename = `Запрос ${data.idOrder}.pdf`;

    const buffer = await generatePdfFromTemplate({
      data,
      pathToTemplate: data?.offerSent ? `templates/orderRequest.seller.hbs` : `templates/orderRequest.customer.hbs`,
    });

    return {
      buffer,
      filename,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при формировании таблицы запроса',
      error: err,
    });
  }
};
