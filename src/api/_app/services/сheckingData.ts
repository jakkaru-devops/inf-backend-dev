import path from 'path';
import appRoot from 'app-root-path';
import * as fs from 'fs';
import Downloader from 'nodejs-file-downloader';
import DecompressZip from 'decompress-zip';
import { IServiceResponse } from '../../../interfaces/common.interfaces';
import { DOWNLOAD_INIT_ZIP, INIT_FOLDERS } from '../data';
import _ from 'lodash';

export const сheckingInitialData = async (): Promise<IServiceResponse<boolean>> => {
  try {
    const patchFolder = path.join(appRoot + '/_init');
    const isFolder = fs.existsSync(patchFolder);

    if (!isFolder) {
      const isDownload = await downloadZip(patchFolder);
      if (isDownload.result) {
        return {
          result: isDownload.result,
        };
      } else
        return {
          result: isDownload.result,
          error: isDownload.error,
        };
    } else {
      try {
        const isSuccess = await dataСomparison(patchFolder);
        if (isSuccess.result) {
          return {
            result: isSuccess.result,
          };
        } else
          return {
            result: isSuccess.result,
            error: isSuccess.error,
          };
      } catch (error) {
        return {
          result: false,
          error: error,
        };
      }
    }
  } catch (error) {
    return {
      result: false,
      error: error,
    };
  }
};

async function decompressZip(patchFolder: string): Promise<IServiceResponse<boolean>> {
  return new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(patchFolder + '/_init.zip');
    unzipper.on('error', function (err) {
      console.error('Caught an error');
      reject({
        result: false,
        error: err,
      });
    });
    unzipper.on('extract', function (log) {
      console.log('Finished extracting');
      resolve({
        result: true,
      });
    });
    unzipper.on('progress', function (fileIndex, fileCount) {
      console.log('Extracted file ' + (fileIndex + 1) + ' of ' + fileCount);
    });
    unzipper.extract({
      path: path.join(appRoot + '/'),
      filter: function (file) {
        return file.type !== 'SymbolicLink';
      },
    });
  });
}
async function downloadZip(patchFolder: string): Promise<IServiceResponse<boolean>> {
  try {
    const downloader = new Downloader({
      url: DOWNLOAD_INIT_ZIP,
      directory: './_init',
      onProgress: function (percentage, chunk, remainingSize) {
        console.log(percentage + ' %');
      },
    });
    console.info('Download ZIP....');
    await downloader.download();
    const flagDecompress = await decompressZip(patchFolder);
    if (flagDecompress.result) {
      const initZip = patchFolder + '/_init.zip';
      const exists = fs.existsSync(initZip);
      if (exists) fs.unlinkSync(initZip);

      return {
        result: true,
      };
    }
  } catch (error) {
    return {
      result: false,
      error: error,
    };
  }
}
async function dataСomparison(patchFolder: string): Promise<IServiceResponse<boolean>> {
  const folders = fs.readdirSync(patchFolder);
  const success = _.isEqual(folders.sort(), INIT_FOLDERS.sort());
  if (success)
    return {
      result: true,
    };
  else {
    try {
      fs.rmdirSync(patchFolder, { recursive: true });
      const isDownload = await downloadZip(patchFolder);
      if (isDownload.result)
        return {
          result: true,
        };
    } catch (error) {
      console.error(error);
      return {
        result: false,
        error: error,
      };
    }
  }
}
