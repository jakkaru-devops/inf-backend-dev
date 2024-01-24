import { IServiceResponse } from '../../../interfaces/common.interfaces';
import httpStatus from 'http-status';
import axios from 'axios';
import { IParams } from '../interfaces';
import { URL_ACAT } from '../data';
import Url from '../utils';

type IResult = {
  count: number;
  data: any;
};

export const getRequestAcat = async (params: IParams): Promise<IServiceResponse<IResult>> => {
  try {
    const { brands } = params;
    const GenerateURL = new Url(params);
    const url = GenerateURL.getUrl(URL_ACAT);

    const response = await axios.get(url, {
      headers: {
        Authorization: `${process.env.ACAT_TOKEN}`,
      },
    });

    let allBrands: {
      type: string;
      name: string;
      value: string;
    }[] = [];

    if (!(response.data && brands)) {
    } else {
      for (const typeAuto of response.data) {
        for (const brand of typeAuto.marks) {
          allBrands.push({
            type: typeAuto.value,
            name: brand.name,
            value: brand.value,
          });
        }
      }
    }

    return {
      result: brands
        ? { count: allBrands.length + 1, data: allBrands }
        : { count: response.data.length + 1, data: response.data },
    };
  } catch (err) {
    return {
      error: {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'An error occurred while retrieving catalog data',
        error: err,
      },
    };
  }
};
