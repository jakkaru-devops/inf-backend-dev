import fs from 'fs';

export const createDir = (path: string) => {
  // path = `${UPLOADS_DIRECTORY}/${path}`
  return new Promise((resolve, reject) => {
    try {
      if (!fs.existsSync(path)) {
        fs.mkdirSync(path, {
          recursive: true,
        });
        return resolve({ message: 'Directory created successfully' });
      } else {
        return reject({ message: 'Directory already exists' });
      }
    } catch (err) {
      return reject(err);
    }
  });
};
