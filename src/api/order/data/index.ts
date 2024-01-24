import ExcelJS from 'exceljs';

export const EXCEL_COL_STYLE: Partial<ExcelJS.Style> = {
  alignment: {
    wrapText: true,
    horizontal: 'center',
    vertical: 'middle',
  },
  border: {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' },
  },
};
export const PRIMARY_COLOR = 'E6332A';
