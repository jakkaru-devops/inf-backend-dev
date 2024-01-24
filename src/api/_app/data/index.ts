import path from 'path';
import appRoot from 'app-root-path';

//Init
export const DOWNLOAD_INIT_ZIP =
  'https://www.4sync.com/web/directDownload/hmBw2FNa/-klnpR2U.711bed4abbc0f89b222285018de1ca91';
export const INIT_FOLDERS = ['docs', 'fias', 'organizations', 'products', 'users'];

//Init catalog
export const DefaultLanguage = 'ru';
export const NAME_FILE_PRODUCTS = 'Валидные_автозапчасти_тест';
export const DEFAULT_SECTION_NAME = 'Автозапчасти';
export const DEFAULT_TYPES_SECTION = ['Разделы'];

export const ALL_PRODUCTS_FOLDER = path.join(appRoot + '/_init/catalog/Products');
export const REMAIN_PRODUCTS_FOLDER = path.join(appRoot + '/_init/catalog/RemainProducts');
export const ALL_PRODUCTS_FILE_PATH = path.join(appRoot + '/_init/catalog/Products.json');
// export const DEMO_PRODUCTS_FILE_PATH = path.join(appRoot + '/_init/catalog/ProductsDemo/SpawnWorker-0.json');
export const DEMO_PRODUCTS_FILE_PATH = path.join(appRoot + '/_init/catalog/partsMerge.json');
export const PRODUCT_ANALOGS_FILE_PATH = path.join(appRoot + '/_init/catalog/Analogs.json');
export const PRODUCT_ANALOGS_FULL_FILE_PATH = path.join(appRoot + '/_init/catalog/ProductsAnalogsFull.json');
export const OUTER_PRODUCTS_JSON_PATH = path.join(appRoot + '/_init/catalog/ProductsOuter.json');
export const OUTER_PRODUCTS_DIRECTORY_PATH = path.join(appRoot + '/_init/catalog/images');

export const OUTER_PRODUCT_TABLES = {
  '0. ТЦ Северный Общая.xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 19,
    photosFolderName: '0. Северный',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '1. ГАЗ Общая - готовая с описанием.xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 18,
    photosFolderName: '1. ГАЗ',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '2. МТ-ЛБ Общая - готовая с описанием.xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 0,
    photosFolderName: '2. МТЛБ',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '3. БАТ общая- готова Петерс (3).xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 18,
    photosFolderName: '3. БАТ',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '4. КИТАЙ общая номенклатура готовая.xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 18,
    photosFolderName: '4. Китай',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '5. TrakTsentr_готовая.xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 18,
    photosFolderName: '5. ТракЦентр',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '6. АльфаТрак Подольский.xlsx': {
    type: 1,
    brand: 2,
    group: 3,
    subgroup: 4,
    article: 7,
    name: 8,
    description: 9,
    weight: 14,
    length: 15,
    width: 16,
    height: 17,
    photosFolder: 18,
    photosFolderName: '6.Альфатракцентр вода',
    photos: [10, 11, 12, 13],
    photo: 10,
  },
  '7. Ключ.xlsx': {
    name: 0,
    article: 1,
    photosFolder: 2,
    weight: 3,
    length: 4,
    width: 5,
    height: 6,
    photosFolderName: '7. Ключ',
    photos: [7, 8, 9],
    photo: 7,
  },
};

export const TYPE_SECTIONS = ['Вид техники', 'Марка', 'Модель', 'Категория', 'Подкатегория'];
