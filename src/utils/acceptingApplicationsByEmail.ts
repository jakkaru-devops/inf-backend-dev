import _ from 'lodash';
import { generateRandomCode } from './common.utils';
import {
  EMAIL_ORDER_FOR_IMAP_SIMPLE,
  PASSWORD_ORDER_FOR_IMAP_SIMPLE,
  UNKNOWN_UPLOAD_SECTION,
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  USERS_UPLOAD_SECTION,
} from '../config/env';
import imaps from 'imap-simple';
import fs from 'fs';
import FormatDate from 'date-fns/format';
import FileModel from '../api/files/models/File.model';
import { executeTransaction } from './transactions.utils';
import ordersService from '../api/order/orders.service';
import { SocketServer } from '../core/socket';
import { simpleParser, Attachment } from 'mailparser';

export async function getUnreadEmails(io: SocketServer) {
  if (!EMAIL_ORDER_FOR_IMAP_SIMPLE) return;

  try {
    const connection = await imaps.connect({
      imap: {
        user: EMAIL_ORDER_FOR_IMAP_SIMPLE,
        password: PASSWORD_ORDER_FOR_IMAP_SIMPLE,
        host: 'imap.mail.ru',
        port: 993,
        tls: true,
        authTimeout: 30000,
      },
    });

    await connection.openBox('INBOX');

    const messages = await connection.search(['UNSEEN'], {
      bodies: ['HEADER', 'TEXT', ''],
      struct: true,
      markSeen: true,
    });

    if (messages.length > 0) {
      for (const message of messages) {
        const all = _.find(message.parts, { which: '' });
        const id = message.attributes.uid;
        const idHeader = 'Imap-Id: ' + id + '\r\n';

        simpleParser(idHeader + all.body, async (err, mail) => {
          const { subject, from } = extractMessageData(message);
          const subjectText = subject;
          const emailAddress = extractEmailAddress(from);
          const messageText = mail?.textAsHtml || mail.text;
          const attachments = mail?.attachments || [];
          const fileIds = await saveAttachments(attachments);

          console.log('New email request', {
            subject,
            emailAddress,
            messageText,
            fileIds,
          });

          if (!!emailAddress && (!!messageText || !!fileIds?.length)) {
            await ordersService.createOrderRequestByEmail({ io, emailAddress, subjectText, messageText, fileIds });
          }
        });
      }
    }

    connection.end();
  } catch (error) {
    console.error('Error connecting to mail server:', error);
  }
}

function extractMessageData(message) {
  const header = message.parts.find(part => part.which === 'HEADER');
  const subject = header.body.subject[0];
  const from = header.body.from[0];

  return { subject, from };
}

function extractEmailAddress(from) {
  const emailRegex = /<([^>]+)>/;
  const match = from.match(emailRegex);
  const emailAddress = match ? match[1] : null;

  return emailAddress;
}

async function saveAttachments(attachments: Attachment[]): Promise<any> {
  return await executeTransaction(async transaction => {
    const fileIds: string[] = [];

    for (const attachmentData of attachments) {
      const filename = attachmentData.filename;
      const buffer = attachmentData.content;
      const fileSize = attachmentData.size;
      const originalFilename = filename;
      const nowDate = FormatDate(new Date(), UPLOADS_DATE_FORMAT);

      const sizeMb = fileSize / 1024 / 1024;

      const newFileName = `${generateRandomCode({
        length: 20,
        symbols: false,
        uppercase: false,
        excludeSimilarCharacters: false,
      })}-${originalFilename}`;

      const fileDBPath = `${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest/${newFileName}`;
      const directoryPath = `${UPLOAD_FILES_DIRECTORY}/${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest`;
      const ext = originalFilename.split('.').pop();

      if (sizeMb > 20) {
        console.error('Максимальный размер файла для загрузки - 20 мб');
        continue; // Пропустить текущий файл и перейти к следующему
      }

      try {
        await fs.promises.mkdir(directoryPath, { recursive: true });
        await fs.promises.writeFile(`${directoryPath}/${newFileName}`, buffer);
        console.log('Изображение успешно сохранено.');

        const newFile = await FileModel.create(
          {
            // userId: authUser.id,
            name: originalFilename,
            ext,
            size: fileSize,
            path: fileDBPath,
            duration: null,
          },
          { transaction },
        );

        fileIds.push(newFile.id);
      } catch (error) {
        fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);
        console.error('Ошибка при создании директории или записи файла:', error);
        throw error; // Пробросить ошибку для обработки во внешнем коде
      }
    }

    return fileIds;
  });
}
