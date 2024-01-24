import fs from 'fs';
import path from 'path';
import xlsx from 'node-xlsx';

export const deleteFolderRecursive = (path: string) => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(file => {
      let curPath = path + '/' + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

export const getPathToDirectory = (dirName: string | number, rootPath: string) => {
  const rootDirs = fs
    .readdirSync(rootPath, {
      withFileTypes: true,
    })
    .map(item => item.name);

  return readFolder(rootPath, dirName, rootDirs, rootPath);
};

function readFolder(searchPath: string, dirName: string | number, searchDirs: string[], rootPath: string) {
  if (typeof dirName === 'number') dirName = dirName.toString();
  const matchDir = searchDirs.find(dir => !!dirName && dir === dirName);
  if (matchDir) return path.join(searchPath, matchDir).replace(rootPath, '');

  for (const dir of searchDirs) {
    const items = fs.readdirSync(path.join(searchPath, dir), {
      withFileTypes: true,
    });
    const dirs = items.filter(item => item.isDirectory()).map(item => item.name);
    // if (!dirs?.length) {
    //   deleteFolderRecursive(path.join(searchPath, dir));
    //   continue;
    // }
    const result = readFolder(path.join(searchPath, dir), dirName, dirs, rootPath);

    if (!!result) {
      return result.replace(rootPath, '');
    } else {
      continue;
    }
  }

  return null;
}

export const getPathToFile = ({ dirPath, searchFilename }: { dirPath: string; searchFilename: string }): string => {
  const items = fs.readdirSync(dirPath, {
    withFileTypes: true,
  });
  const files = items
    .filter(item => item.isFile())
    .map(item =>
      item.name
        .split('.')
        .slice(0, -1)
        .join('.')
        .replace(/[^a-zA-Z0-9]/g, ''),
    );
  // .map(item => item.name.split('.').slice(0, -1).join('.').replace(/ /g, '').replace(/--/g, '-'));
  if (!!files.find(filename => filename === searchFilename)) {
    console.log(`FOUND ${searchFilename} in ${files}`);
    return dirPath;
  }

  const dirs = items.filter(item => item.isDirectory()).map(item => item.name);
  for (const dirName of dirs) {
    const filepath = path.join(dirPath, dirName);
    const result = getPathToFile({ dirPath: filepath, searchFilename });
    if (!!result) return result;
  }

  return null;
};

export const getFilesFromDirectory = (dir: string, files_?: any[]) => {
  files_ = files_ || [];
  const files = fs.readdirSync(dir);

  for (const i in files) {
    const name = dir + '/' + files[i];
    if (fs.statSync(name).isDirectory()) {
      getFilesFromDirectory(name, files_);
    } else {
      files_.push(name);
    }
  }
  return files_;
};

export const getDataXlsxFiles = (files_: any[]): { name: string; data: any[] }[] => {
  let PRODUCT_FROM_TABLES = [];
  for (const filePath of files_) {
    const fileName = filePath.replace(/^.*[\\/]/, '');
    const extname = path.extname(filePath);
    if (extname === '.xlsx') {
      try {
        const workSheetsFromBuffer = xlsx.parse(fs.readFileSync(filePath));
        let data = workSheetsFromBuffer[0].data;
        PRODUCT_FROM_TABLES.push({
          name: fileName,
          data,
        });
      } catch (e) {
        console.log('Не подлежит чтению');
      }
    }
  }
  return PRODUCT_FROM_TABLES;
};

export const listDirectories = (dir: string, callback: (...args: any) => void) => {
  fs.readdir(dir, (err, fileNames) => {
    if (err) return callback(err);
    if (!fileNames.length) return callback(null, []);

    let remaining = fileNames.length;

    const subDirs = [];
    fileNames.forEach(name => {
      const pathToFile = path.join(dir, name);
      fs.stat(pathToFile, (err, stats) => {
        if (err) return callback(err);

        if (stats.isDirectory()) {
          subDirs.push({
            pathToFile,
            name,
          });
          listDirectories(pathToFile, (err, subSubDirs) => {
            if (err) return callback(err);
            subDirs.push(...subSubDirs);
            if (!--remaining) {
              callback(null, subDirs);
            }
          });
        } else if (!--remaining) {
          callback(null, subDirs);
        }
      });
    });
  });
};
