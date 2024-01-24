import { Request, Response } from 'express';
import httpStatus from 'http-status';
import FormatDate from 'date-fns/format';
import fs from 'fs';

import { APIError, APIResponse } from '../../utils/api.utils';
import { executeTransaction } from '../../utils/transactions.utils';
import {
  UNKNOWN_UPLOAD_SECTION,
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  USERS_UPLOAD_SECTION,
} from '../../config/env';
import { generateRandomCode } from '../../utils/common.utils';
import FileModel from './models/File.model';
import { createDir } from './utils';
import fileUpload, { UploadedFile } from 'express-fileupload';

class FilesCtrl {
  /**
   * @desc      Get file list by ids
   * @route     POST /file/list
   * @query     { ids: string[] }
   * @success 	{ FileModel[] }
   * @access    Public
   */
  getFileList = async (req: Request, res: Response) => {
    try {
      const ids = req.query.ids as string[];

      const files = await FileModel.findAll({
        where: {
          id: ids,
        },
      });

      return APIResponse({
        res,
        data: files,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список файлов не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Upload unknown file - file that is not linked to any entity yet
   * @route     POST /file/unknown
   * @files     { file: File, duration: number }
   * @success 	{ result: FileModel, message: string }
   * @access    Public
   */
  uploadUnknownFile = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      const filename = req.body?.filename;
      const file = req.files.file as UploadedFile;
      const duration = req.body?.duration;
      const nowDate = FormatDate(new Date(), UPLOADS_DATE_FORMAT);
      const originalFilename = filename || file.name;
      const newFileName = `${generateRandomCode({
        length: 20,
        symbols: false,
        uppercase: false,
        excludeSimilarCharacters: false,
      })}-${originalFilename}`;
      const fileDBPath = `${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest/${newFileName}`;
      const directoryPath = `${UPLOAD_FILES_DIRECTORY}/${UNKNOWN_UPLOAD_SECTION}/${nowDate}/${USERS_UPLOAD_SECTION}/guest`;
      const ext = originalFilename.split('.').pop();

      const sizeMb = file.size / 1024 / 1024;
      if (sizeMb > 20) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Максимальный размер файла для загрузки - 20 мб',
        });
      }

      try {
        const newFile = await FileModel.create(
          {
            // userId: authUser.id,
            name: originalFilename,
            ext,
            size: file.size,
            path: fileDBPath,
            duration: +duration || null,
          },
          { transaction: t },
        );

        if (!fs.existsSync(directoryPath)) {
          const newDir = await createDir(directoryPath);
          if (!newDir) {
            throw APIError({
              res,
              status: httpStatus.INTERNAL_SERVER_ERROR,
              message: 'Директория не была создана',
              error: newDir as any,
            });
          }
        }
        await file.mv(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`).catch(err => {
          throw APIError({
            res,
            status: httpStatus.INTERNAL_SERVER_ERROR,
            message: 'Файл не загружен',
            error: err,
          });
        });

        return APIResponse({
          res,
          data: {
            result: newFile,
            message: 'File uploaded successfully',
          },
        });
      } catch (err) {
        fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${fileDBPath}`);
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Файл не загружен',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete unknown file - file that is not linked to any entity yet
   * @route     DELETE /file/unknown
   * @query     { fileId: string }
   * @success 	{ message: string }
   * @access    Public
   */
  dropUnknownFile = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { fileId } = req.query;

        const file = await FileModel.findByPk(fileId as string, {
          attributes: ['id', 'path'],
          transaction: t,
        });
        await file.destroy({
          transaction: t,
        });

        await fs.promises.unlink(`${UPLOAD_FILES_DIRECTORY}/${file.path}`);

        return APIResponse({
          res,
          data: {
            message: 'Файл удален',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Файл не был удален',
          error: err,
        });
      }
    });
  };
}

export default FilesCtrl;
