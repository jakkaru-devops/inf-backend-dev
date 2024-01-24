import { Request, Response } from 'express';
import axios from 'axios';
import { APIError, APIResponse } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import { EXTERNAL_CATALOG_URL } from '../../../config/env';

class Laximo {
  private readonly _laximoBaseUrl: string;
  private readonly _type: 'cars' | 'trucks';

  constructor(laximoBaseUrl) {
    this._laximoBaseUrl = laximoBaseUrl;
    if (laximoBaseUrl == 'http://localhost:8085/trucks') {
      this._type = 'trucks';
    }
    if (laximoBaseUrl == 'http://localhost:8085/cars') {
      this._type = 'cars';
    }
  }

  getBaseUrl = () => this._laximoBaseUrl;

  handleEveryLaximoGetRequest = async (req: Request, res: Response) => {
    return res.redirect(301, EXTERNAL_CATALOG_URL + req.url);
  };

  getOEMPartApplicability = async (req: Request, res: Response) => {
    try {
      const { catalogCode, oem, ssd } = req.query;
      const cars = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/units/categories/catalog/${catalogCode}/oem/${oem}/ssd/${ssd}`,
      });

      return APIResponse({
        res,
        data: cars.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Детали не загружены',
        error,
      });
    }
  };

  getCarsByChassisNumber = async (req: Request, res: Response) => {
    try {
      const { param1, param2, catalogCode } = req.query;
      const cars = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/car/execCustom/catalog/${catalogCode}/param1/${param1}/param2/${param2}`,
      });

      return APIResponse({
        res,
        data: cars.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Автомобили не загружены',
        error,
      });
    }
  };

  getCarsByOem = async (req: Request, res: Response) => {
    try {
      const { oem, catalogCode } = req.query;
      const cars = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/details/applicable/oem/${oem}/catalog/${catalogCode}`,
      });

      return APIResponse({
        res,
        data: cars.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Автомобили не загружены',
        error,
      });
    }
  };

  getCatalogAll = async (_: Request, res: Response) => {
    try {
      const catalogs = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/catalog/all`,
      });
      const data = catalogs.data.data.catalogs.map(catalog => ({ ...catalog, urlType: this._type }));

      return APIResponse({
        res,
        data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Каталоги не загружены',
        error,
      });
    }
  };

  getCatalogInfo = async (req: Request, res: Response) => {
    try {
      const { catalogCode } = req.query;
      const catalogInfo = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/catalog/${catalogCode}`,
      });
      catalogInfo.data.data.laximo = true;
      catalogInfo.data.data.urlType = this._type;

      return APIResponse({
        res,
        data: catalogInfo.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Информация о каталоге не загружена',
        error,
      });
    }
  };

  getCarByVinOrFrame = async (req: Request, res: Response) => {
    try {
      const { vinOrFrame } = req.query;
      const carInfo = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/car/vinOrFrame/${vinOrFrame}`,
      });
      carInfo.data.data.urlType = this._type;
      return APIResponse({
        res,
        data: carInfo.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Информация об автомобиле не загружена',
        error,
      });
    }
  };

  getWizardByCatalogCode = async (req: Request, res: Response) => {
    try {
      const { catalogCode } = req.query;
      const wizards = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/car/wizard/catalog/${catalogCode}`,
      });
      wizards.data.data.urlType = this._type;

      return APIResponse({
        res,
        data: wizards.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Параметры поиска по каталогу не загружены',
        error,
      });
    }
  };

  getWizardByCatalogCodeAndSsd = async (req: Request, res: Response) => {
    try {
      const { catalogCode, ssd } = req.query;
      const wizards = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/car/wizard/catalog/${catalogCode}/ssd/${ssd}`,
      });
      wizards.data.data.urlType = this._type;

      return APIResponse({
        res,
        data: wizards.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Параметры поиска по каталогу не загружены',
        error,
      });
    }
  };

  getCarsByWizardSsd = async (req: Request, res: Response) => {
    try {
      const { catalogCode, ssd } = req.query;
      const vehicles = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/car/vehicleByWizard/catalog/${catalogCode}/ssd/${ssd}`,
      });

      return APIResponse({
        res,
        data: vehicles.data.data,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Автомобили по заданым параметрам не загружены',
        error,
      });
    }
  };

  getCarInfo = async (req: Request, res: Response) => {
    try {
      const { vehicleId, catalogCode, ssd } = req.query;
      const carInfo = await Promise.all([
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/car/${vehicleId}/info/catalog/${catalogCode}/ssd/${ssd}`,
        }),
      ]);
      carInfo[0].data.data.urlType = this._type;

      return APIResponse({
        res,
        data: {
          carInfo: carInfo[0].data.data,
        },
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Автомобиль по заданым параметрам не загружен',
        error,
      });
    }
  };

  getCarInfoByGroups = async (req: Request, res: Response) => {
    try {
      const { vehicleId, catalogCode, ssd } = req.query;
      const carInfo = await Promise.all([
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/car/${vehicleId}/info/catalog/${catalogCode}/ssd/${ssd}`,
        }),
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/car/${vehicleId}/quickListNodes/catalog/${catalogCode}/ssd/${ssd}`,
        }),
      ]);

      carInfo[0].data.data.urlType = this._type;
      carInfo[1].data.data.urlType = this._type;

      return APIResponse({
        res,
        data: {
          carInfo: carInfo[0].data.data,
          quickList: carInfo[1].data.data,
        },
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Автомобиль и детали по заданым параметрам не загружен',
        error,
      });
    }
  };

  getCarInfoByNodes = async (req: Request, res: Response) => {
    try {
      const { vehicleId, catalogCode, ssd, categoryId } = req.query;
      const unitsUrl = categoryId
        ? `${this._laximoBaseUrl}/units/catalog/${catalogCode}/car/${vehicleId}/categoryId/${categoryId}/ssd/${ssd}`
        : `${this._laximoBaseUrl}/units/catalog/${catalogCode}/car/${vehicleId}/ssd/${ssd}`;
      console.log(unitsUrl);
      const carInfo = await Promise.all([
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/car/${vehicleId}/info/catalog/${catalogCode}/ssd/${ssd}`,
        }),
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/units/categories/catalog/${catalogCode}/car/${vehicleId}/ssd/${ssd}`,
        }),
        axios({
          method: 'get',
          url: unitsUrl,
        }),
      ]);

      return APIResponse({
        res,
        data: {
          carInfo: carInfo[0].data.data,
          categories: carInfo[1].data.data.categories,
          units: carInfo[2].data.data.units,
        },
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Автомобиль и детали по заданым параметрам не загружены',
        error,
      });
    }
  };

  getDetailsListInUnit = async (req: Request, res: Response) => {
    try {
      const { catalogCode, unitId, ssd } = req.query;
      const detailsInfo = await Promise.all([
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/details/catalog/${catalogCode}/unitId/${unitId}/ssd/${ssd}`,
        }),
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/details/imageMap/catalog/${catalogCode}/unitId/${unitId}/ssd/${ssd}`,
        }),
        axios({
          method: 'get',
          url: `${this._laximoBaseUrl}/details/unitInfo/catalog/${catalogCode}/unitId/${unitId}/ssd/${ssd}`,
        }),
      ]);

      return APIResponse({
        res,
        data: {
          details: detailsInfo[0].data.data.details,
          imageMap: detailsInfo[1].data.data,
          unitInfo: detailsInfo[2].data.data,
        },
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Детали по заданым параметрам не загружены',
        error,
      });
    }
  };

  getQuickListDetails = async (req: Request, res: Response) => {
    try {
      const { vehicleId, groupId, catalogCode, ssd } = req.query;
      const detailsQuickListInfo = await axios({
        method: 'get',
        url: `${this._laximoBaseUrl}/car/${vehicleId}/quickListDetails/groupId/${groupId}/catalog/${catalogCode}/ssd/${ssd}`,
      });

      return APIResponse({
        res,
        data: detailsQuickListInfo.data.data.categories,
      });
    } catch (error) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Детали по заданым параметрам не загружены',
        error,
      });
    }
  };
}

export default Laximo;
