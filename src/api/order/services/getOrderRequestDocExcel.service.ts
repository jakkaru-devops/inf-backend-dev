import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';
import UserRoles from '../../role/models/UserRoles.model';
import ExcelJS from 'exceljs';
import { stripString } from '../../../utils/common.utils';
import { EXCEL_COL_STYLE } from '../data';
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

export const getOrderRequestDocExcelService = async ({ res, authUserRole, data }: IProps): Promise<IResult> => {
  try {
    const filename = `Запрос ${data.idOrder}.xlsx`;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Запрос ${data.idOrder}`);

    ws.addRow([`Номер запроса: ${data.idOrder}`]);
    ws.addRow([`Дата запроса: ${data.date}`]);
    if (authUserRole.role.label !== 'customer') {
      ws.addRow([`Покупатель: ${data.customerName}`]);
    }
    ws.addRow([`Адрес доставки: ${data.deliveryAddress}`]);
    if (!!data?.comment) {
      ws.addRow([`Комментарий: ${data.comment}`]);
    }

    if (!!data.describedProduct) {
      ws.addRow([`Категория товара: ${data.describedProduct.categories}`]);
      ws.addRow([`Количество: ${data.describedProduct.quantity}`]);
      if (!!data?.describedProduct?.description) {
        ws.addRow([`Описание товара: ${data?.describedProduct?.description}`]);
      }
      if (authUserRole.role.label !== 'seller') {
        ws.addRow([`Регион поставщика: ${data.sellerRegion}`]);
        if (!!data?.selectedSellers) {
          ws.addRow([`Выбранные продавцы: ${data?.selectedSellers}`]);
        }
      }
    }

    if (data.displayProducts) {
      ws.addRow([]);

      if (!data.offerSent) {
        const colsWidth = [10, 30, 14, 14, 8];
        ws.addRow(['№', 'Наименование', 'Бренд', 'Артикул', 'Кол-во']);

        ws.lastRow.eachCell((cell, colNumber) => {
          cell.style = EXCEL_COL_STYLE;
          ws.getColumn(colNumber).width = colsWidth[colNumber - 1];
        });

        for (const product of data.products) {
          ws.addRow([product.index, product.name, product.manufacturer, product.article, product.requestedQuantity]);
          ws.lastRow.eachCell(cell => (cell.style = EXCEL_COL_STYLE));
        }
      } else {
        const colsWidth = [10, 24, 14, 14, 8, 10, 10, 12, 12, 12, 10];
        ws.addRow([
          '№',
          'Наименование',
          'Бренд',
          'Артикул',
          'Кол-во',
          'Цена за ед, ₽',
          'Кол-во в наличии',
          'Под заказ',
          '',
          'Сумма, ₽',
          'CASH, ₽',
        ]);
        const uniteCells = ['H', 'I'];
        ws.mergeCells(`${uniteCells[0]}${ws.rowCount}:${uniteCells[1]}${ws.rowCount}`);
        ws.addRow(['', '', '', '', '', '', '', 'кол-во', 'поступление*', '']);
        const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
        for (const letter of letters) {
          if (uniteCells.includes(letter)) continue;
          ws.mergeCells(`${letter}${ws.rowCount - 1}:${letter}${ws.rowCount}`);
        }

        for (const rowNumber of [ws.rowCount - 1, ws.rowCount]) {
          ws.getRow(rowNumber).eachCell((cell, colNumber) => {
            cell.style = EXCEL_COL_STYLE;
            ws.getColumn(colNumber).width = colsWidth[colNumber - 1];
          });
        }

        for (const product of data.products) {
          ws.addRow([
            product.index,
            product.name,
            product.manufacturer,
            product.article,
            product.requestedQuantity,
            product.unitPrice,
            product.offeredQuantity,
            product.deliveryQuantity,
            product.deliveryTerm,
            product.totalPrice,
            product.cash,
          ]);
          ws.lastRow.eachCell(cell => {
            cell.style = EXCEL_COL_STYLE;
          });
        }

        ws.addRow([
          '',
          '',
          '',
          'Итого',
          data.total.requestedQuantity,
          '',
          data.total.offeredQuantity,
          '',
          '',
          data.total.price,
          data.total.cash,
        ]);
        // ws.mergeCells(`A${ws.rowCount}:D${ws.rowCount}`);
        ws.lastRow.eachCell(cell => {
          cell.style = EXCEL_COL_STYLE;
        });

        ws.addRow(['', '', '', 'Комиссия', '', '', '', '', '', data.total.comission, '']);
        // ws.mergeCells(`A${ws.rowCount}:D${ws.rowCount}`);
        ws.lastRow.eachCell(cell => {
          cell.style = EXCEL_COL_STYLE;
        });

        ws.addRow(['', '', '', 'За вычетом комиссии', '', '', '', '', '', data.total.earn, '']);
        // ws.mergeCells(`A${ws.rowCount}:D${ws.rowCount}`);
        ws.lastRow.eachCell(cell => {
          cell.style = EXCEL_COL_STYLE;
        });
      }
    }

    const buffer = await wb.xlsx.writeBuffer();

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
