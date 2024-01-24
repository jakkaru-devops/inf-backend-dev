import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import { EXCEL_COL_STYLE } from '../data';
import OrderRequest from '../models/OrderRequest.model';
import ordersService from '../orders.service';
import ExcelJS from 'exceljs';

interface IProps {
  orderId: OrderRequest['id'];
  authUser: User;
  authUserRole: UserRoles;
}

export const getOffersAnalyticsDocExcelService = async ({ orderId, authUser, authUserRole }: IProps) => {
  const { orderRequest, offers } = await ordersService.getOrderRequestWithOffers({
    orderId,
    regionFiasId: null,
    authUser,
    authUserRole,
  });

  const filename = `Аналитика по заказу ${orderRequest.idOrder}.xlsx`;
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`Аналитика`);
  worksheet.properties.defaultRowHeight = 25;
  const colsWidth = [40, 15];
  const widthColumn = [14, 14, 14];

  // first row
  const firstRow = ['Наименование', 'Запрашиваемое количество, шт.'];
  for (let i = 0; i < offers.rows.length; i++) {
    colsWidth.push(...widthColumn);
    const org = offers?.rows[i].organization.name;
    firstRow.push(org, '', '');
  }
  worksheet.addRow(firstRow);
  worksheet.lastRow.eachCell(cell => {
    cell.style = EXCEL_COL_STYLE;
  });

  // secondFirst
  const secondFirst = ['', ''];
  for (let i = 0; i < offers.rows.length; i++) {
    secondFirst.push('Количество в наличии, шт.', 'Количество под заказ, шт.', 'Цена за шт. Р');
  }
  worksheet.addRow(secondFirst);
  worksheet.lastRow.eachCell(cell => {
    cell.style = EXCEL_COL_STYLE;
  });
  const rowFirst = worksheet.getRow(1);
  const rowSecond = worksheet.getRow(2);
  rowFirst.height = 45;
  rowSecond.height = 35;

  const allOfferedProducts = orderRequest.products.filter(requestProduct =>
    offers.rows.some(offer =>
      offer.products.some(offerProduct => offerProduct.requestedProductId === requestProduct.id),
    ),
  );

  for (const requestProduct of allOfferedProducts) {
    const productName = requestProduct?.altName || requestProduct?.product?.name_ru || requestProduct?.reserveName;
    const productRow = [productName, requestProduct.quantity];
    let bestPrice = {
      cells: [] as number[],
      value: 999999999,
    };
    let worstPrice = {
      cells: [] as number[],
      value: 0,
    };

    for (const offer of offers.rows) {
      const offerProduct = offer.products.find(offerProduct => offerProduct.requestedProductId === requestProduct.id);
      productRow.push(
        offerProduct?.quantity || '-',
        offerProduct?.deliveryQuantity || '-',
        offerProduct?.unitPrice || '-',
      );

      if (!!offerProduct) {
        if (offerProduct.unitPrice < bestPrice.value)
          bestPrice = {
            cells: [productRow.length],
            value: offerProduct.unitPrice,
          };
        if (offerProduct.unitPrice === bestPrice.value) bestPrice.cells.push(productRow.length);

        if (offerProduct.unitPrice > worstPrice.value) {
          worstPrice = {
            cells: [productRow.length],
            value: offerProduct.unitPrice,
          };
        }
        if (offerProduct.unitPrice === worstPrice.value) worstPrice.cells.push(productRow.length);
      }
    }

    worksheet.addRow(productRow);
    worksheet.lastRow.eachCell((cell, i) => {
      const cellStyle: Partial<ExcelJS.Style> = {};

      if (worstPrice.cells.includes(i)) {
        cellStyle.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'ff0000' },
        };
      }
      if (bestPrice.cells.includes(i)) {
        cellStyle.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '32CD32' },
        };
      }

      cell.style = {
        ...EXCEL_COL_STYLE,
        ...cellStyle,
      };
    });
  }

  const nameColumnsMerged = ['C1:E1', 'F1:H1', 'I1:K1', 'L1:N1', 'O1:Q1', 'R1:T1', 'U1:V1', 'W1:Y1', 'X1:Z1'];
  for (let i = 0; i < offers.rows.length; i++) {
    worksheet.mergeCells(nameColumnsMerged[i]);
  }

  for (const rowNumber of [worksheet.rowCount - 1, worksheet.rowCount]) {
    worksheet.getRow(rowNumber).eachCell((cell, colNumber) => {
      worksheet.getColumn(colNumber).width = colsWidth[colNumber - 1];
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();

  return {
    filename,
    buffer,
  };
};
