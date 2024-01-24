import httpStatus from 'http-status';
import { PRODUCT_STATUSES } from '../data';
import { ICreateProductDto } from '../interfaces/dto';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  data: ICreateProductDto;
  action: 'create' | 'update';
}

export const validateProductData = async ({ data, action }: IProps) => {
  const {
    status,
    article,
    additionalArticles,
    code,
    manufacturer,
    weight,
    length,
    width,
    height,
    params,
    files,
    previewFileId,
    acatProductId,
    laximoProductId,
    name,
    description,
    analogs,
    applicabilities,
  } = data;

  try {
    if (
      (action === 'create' || (action === 'update' && typeof status !== 'undefined')) &&
      !Object.values(PRODUCT_STATUSES).includes(status)
    ) {
      throw new Error('Недопустимый статус товара');
    }

    if (
      !!additionalArticles &&
      (!Array.isArray(additionalArticles) || !!additionalArticles.find(el => typeof el !== 'string'))
    ) {
      throw new Error('Недопустимый формат дополнительных артикулов - additionalArticles');
    }

    if (!!params && (typeof params !== 'object' || !!Array.isArray(params))) {
      throw new Error('Недопустимый формат дополнительных параметров - params');
    }

    if (action === 'create' || (action === 'update' && !!name)) {
      if (!name?.trim()?.length) {
        throw new Error(`Некорректное название товара`);
      }
    }

    if (!!applicabilities) {
      for (const item of [...applicabilities.added, ...applicabilities.updated]) {
        if (!item?.autoBrandId && !item?.autoBrandName) {
          throw new Error('Необходимо указать марку авто в применяемости');
        }
        if (!item?.autoModelId && !item?.autoModelName) {
          throw new Error('Необходимо указать модель авто в применяемости');
        }
        if (!item?.article) {
          throw new Error('Необходимо указать артикул в применяемости');
        }
      }
    }
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: err,
      error: err,
    });
  }
};
