import hb from 'handlebars';
import puppeteer from 'puppeteer';
import utils from 'util';
import fs from 'fs';
import { UPLOAD_FILES_DIRECTORY } from '../config/env';
import { generateRandomCode } from './common.utils';
import path from 'path';
import FileModel from '../api/files/models/File.model';
import OrderRequestFile from '../api/order/models/OrderRequestFile.model';
import { createDir } from '../api/files/utils';
import appRoot from 'app-root-path';
import { Transaction } from 'sequelize';
import { browserService } from '../core/utils/browser';

const readFile = utils.promisify(fs.readFile);

interface IPropsGeneratePdfFromTemplate {
  pathToTemplate: string;
  pathToResultPdf?: string;
  data: any;
}

interface IPropsUploadPdf {
  data: any;
  pathToTemplate: string;
  pathToPdfFolder: string;
  pdfName?: string;
  group?:
    | 'attachment'
    | 'invoice'
    | 'accountingDocument'
    | 'acceptanceCertificate'
    | 'waybill'
    | 'check'
    | 'specification';
  transaction?: Transaction;
}

//Генерируется пдфник, принимает абсолютные пути
export const generatePdfFromTemplate = async ({
  pathToTemplate,
  data,
  pathToResultPdf,
}: IPropsGeneratePdfFromTemplate): Promise<Buffer> => {
  try {
    const template = hb.compile(await readFile(pathToTemplate, 'utf8'), { strict: true });
    const html = template(data);
    const page = await browserService.browser.newPage();

    await page.setContent(html, { waitUntil: ['domcontentloaded', 'networkidle0', 'load'] });

    const pdf = await page.pdf({
      path: pathToResultPdf || null,
      format: 'a4',
      margin: {
        top: '0.75in',
        bottom: '0.75in',
        left: '0.6in',
        right: '0.52in',
      },
    });

    await page.close();

    return pdf;
  } catch (err) {
    console.log(err);
    throw new Error(err);
  }
};

//Пдфник добавляется в таблички и генерируется c помощью generatePdfFromTemplate
export const uploadPdf = async ({
  data,
  pathToTemplate,
  pathToPdfFolder,
  pdfName,
  group,
  transaction,
}: IPropsUploadPdf): Promise<{ file: FileModel; pdf: Buffer }> => {
  const newFileName = `${generateRandomCode({
    length: 20,
    symbols: false,
    uppercase: false,
    excludeSimilarCharacters: false,
  })}-${pdfName
    .replace(/[/\\?%*:|"<>]/g, '') // remove illegal symbols
    .split(' ')
    .join('_')}`;

  const options = {
    transaction,
  };

  const templatePath = path.join(appRoot + `/` + pathToTemplate);

  const fileDBPath = `${pathToPdfFolder}/${newFileName}`;
  const directoryPath = `${UPLOAD_FILES_DIRECTORY}/${pathToPdfFolder}`;

  try {
    const newFile = await FileModel.create(
      {
        name: pdfName,
        ext: 'pdf',
        size: 123,
        path: fileDBPath,
      },
      options,
    );

    if (!fs.existsSync(directoryPath)) {
      const newDir = await createDir(directoryPath);
      if (!newDir) {
        throw new Error('Директория не была создана');
      }
    }

    const pdf = await generatePdfFromTemplate({
      pathToTemplate: templatePath,
      data,
      pathToResultPdf: `${directoryPath}/${newFileName}`,
    });

    return {
      file: newFile,
      pdf,
    };
  } catch (err) {
    throw new Error(err);
  }
};
