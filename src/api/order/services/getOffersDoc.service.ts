import UserRoles from '../../role/models/UserRoles.model';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { getSelectedProductListDocPdfService } from './getSelectedProductListDocPdf.service';
import ExcelJS from 'exceljs';
import formatDate from 'date-fns/format';
import { convertAddressToString, gaussRound, getUserName, millisecondsToMdhm } from '../../../utils/common.utils';
import { EXCEL_COL_STYLE } from '../data';
import ordersService from '../orders.service';

interface IProps {
  orderId: OrderRequest['id'];
  mode: 'extended' | 'list';
  docType: 'xlsx' | 'pdf';
  authUser: User;
  authUserRole: UserRoles;
}

export const getOffersDocService = async ({ orderId, mode, docType, authUser, authUserRole }: IProps) => {
  if (docType === 'pdf') {
    const { file } = await getSelectedProductListDocPdfService({
      orderId,
      mode,
      authUser,
      authUserRole,
    });

    const orderRequest = await OrderRequest.findByPk(orderId);

    return {
      filename: `Запрос ${orderRequest.idOrder} - предложения.pdf`,
      buffer: file,
    };
  }

  const { orderRequest, offers, selectedProducts } = await ordersService.getOrderRequestWithOffers({
    orderId,
    regionFiasId: null,
    authUser,
    authUserRole,
  });

  if (!mode || mode === 'extended') {
    if (mode === 'extended') {
      offers.rows = offers.rows
        .map(
          offer =>
            ({
              ...offer,
              products: offer.products.filter(product => product.isSelected),
            } as Order),
        )
        .filter(offer => !!offer?.products?.length);
    }

    const filename = `Запрос ${orderRequest.idOrder} - предложения.xlsx`;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Предложения`);

    worksheet.addRow([`Номер запроса: ${orderRequest.idOrder}`]);
    worksheet.addRow([`Дата запроса: ${formatDate(new Date(orderRequest.createdAt), 'dd.MM.yyyy HH:mm')}`]);
    worksheet.addRow([]);

    for (let offerIndex = 0; offerIndex < offers.rows.length; offerIndex++) {
      const offer = offers.rows[offerIndex];
      const offerTerm = new Date(offer?.offerExpiresAt).getTime() - new Date().getTime();

      worksheet.addRow([]);
      worksheet.addRow([`Предложение ${offerIndex + 1}`]);
      if (
        !!offer?.products?.filter(
          ({ altName, altManufacturer, altArticle }) => !!altName || !!altManufacturer || !!altArticle,
        )?.length
      ) {
        worksheet.addRow([`Продавец внес изменения в запрос!`]);
        worksheet.lastRow.eachCell(cell => (cell.style.font.bold = true));
      }
      if (offerTerm > 0) {
        if (!!offer?.sellerUpdatedAt) worksheet.addRow([`Предложение обновлено!`]);
        worksheet.addRow([`Действует еще ${millisecondsToMdhm(offerTerm)}`]);
      } else {
        worksheet.addRow([`Срок предложения истек`]);
      }
      worksheet.addRow([
        `Продавец: ${getUserName(offer.seller)}. Рейтинг: ${gaussRound(offer.seller.ratingValue || 0, 1)}, отзывы: ${
          offer.seller.reviews.length
        }, продаж: ${offer.seller.salesNumber || 0}`,
      ]);
      worksheet.addRow([`Адрес поставщика: ${convertAddressToString(offer.organization.actualAddress)}`]);
      worksheet.addRow([`Цены указаны: ${offer.organization.hasNds ? 'с НДС' : 'без НДС'}`]);
      worksheet.addRow([`${offer.organization.name}`]);

      worksheet.addRow([]);

      const colsWidth = [10, 24, 14, 14, 8, 10, 10, 12, 12, 12];
      worksheet.addRow([
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
      ]);
      const uniteCells = ['H', 'I'];
      worksheet.mergeCells(`${uniteCells[0]}${worksheet.rowCount}:${uniteCells[1]}${worksheet.rowCount}`);
      worksheet.addRow(['', '', '', '', '', '', '', 'кол-во', 'поступление*', '']);
      const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];
      for (const letter of letters) {
        if (uniteCells.includes(letter)) continue;
        worksheet.mergeCells(`${letter}${worksheet.rowCount - 1}:${letter}${worksheet.rowCount}`);
      }

      for (const rowNumber of [worksheet.rowCount - 1, worksheet.rowCount]) {
        let i = 0;
        worksheet.getRow(rowNumber).eachCell((cell, colNumber) => {
          cell.style = EXCEL_COL_STYLE;
          worksheet.getColumn(colNumber).width = colsWidth[colNumber - 1];
          i++;
        });
      }

      for (let i = 0; i < offer.products.length; i++) {
        const product: any = offer.products[i];
        worksheet.addRow([
          i + 1,
          product?.altName || product.product.name,
          product?.altManufacturer || product?.product?.manufacturer || '-',
          product?.altArticle || product?.product?.article || '-',
          product.count || 1,
          gaussRound(product.unitPrice, 2),
          product.quantity || '-',
          product.deliveryQuantity || '-',
          product.deliveryTerm || '-',
          gaussRound(product.count * product.unitPrice, 2),
        ]);
        worksheet.lastRow.eachCell(cell => {
          cell.style = EXCEL_COL_STYLE;
        });
      }

      worksheet.addRow([
        '',
        '',
        '',
        'Итого',
        offer.products
          // .filter(({ isSelected }) => isSelected)
          .map(({ count }) => count)
          .reduce((a, b) => a + b, 0),
        '',
        offer.products
          // .filter(({ isSelected }) => isSelected)
          .map(product => product.quantity)
          .filter(Boolean)
          .reduce((a, b) => a + b, 0),
        '',
        '',
        gaussRound(
          offer.products
            // .filter(({ isSelected }) => isSelected)
            .map(product => product.count * product.unitPrice)
            .filter(Boolean)
            .reduce((a, b) => a + b, 0),
          2,
        ),
      ]);
      worksheet.lastRow.eachCell(cell => {
        cell.style = EXCEL_COL_STYLE;
      });

      worksheet.addRow([]);
    }

    worksheet.addRow([]);
    worksheet.addRow([
      `Итого: ${offers.rows
        .map(offer =>
          gaussRound(
            offer.products
              // .filter(({ isSelected }) => isSelected)
              .map(product => product.count * product.unitPrice)
              .filter(Boolean)
              .reduce((a, b) => a + b, 0),
            2,
          ),
        )
        .reduce((a, b) => a + b, 0)}`,
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      filename,
      buffer,
    };
  } else if (mode === 'list') {
    const filename = `Запрос ${orderRequest.idOrder} - предложения.xlsx`;

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Товары`);

    ws.addRow([`Номер запроса: ${orderRequest.idOrder}`]);
    ws.addRow([`Дата запроса: ${formatDate(new Date(orderRequest.createdAt), 'dd.MM.yyyy HH:mm')}`]);
    ws.addRow([]);

    const colsWidth = [24, 14, 14, 8, 12];
    ws.addRow(['Наименование', 'Бренд', 'Артикул', 'Кол-во', 'Сумма, ₽']);
    ws.lastRow.eachCell((cell, colNumber) => {
      cell.style = EXCEL_COL_STYLE;
      ws.getColumn(colNumber).width = colsWidth[colNumber - 1];
    });

    for (let i = 0; i < selectedProducts.length; i++) {
      const product: any = selectedProducts[i];
      ws.addRow([
        product.product.name,
        product.product.manufacturer || '-',
        product.product.article || '-',
        product.count || '-',
        gaussRound(product.totalPrice, 2),
      ]);
      ws.lastRow.eachCell(cell => {
        cell.style = EXCEL_COL_STYLE;
      });
    }

    ws.addRow([]);
    ws.addRow([
      `Итого: ${gaussRound(
        selectedProducts.map(product => product.totalPrice as number).reduce((a, b) => a + b),
        2,
      )}`,
    ]);

    const buffer = await wb.xlsx.writeBuffer();

    return {
      filename,
      buffer,
    };
  }
};
