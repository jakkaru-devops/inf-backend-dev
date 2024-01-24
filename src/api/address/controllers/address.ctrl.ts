import { Request, Response } from 'express';
import axios from 'axios';
import httpStatus from 'http-status';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { DADATA_TOKEN } from '../../../config/env';
import { IAddressBound, IAddressContext, IAddressTarget } from '../interfaces';
import { tranformObjectKeysToSnakeCase, transformObjectKeysCase } from '../../../utils/common.utils';

class AddressCtrl {
  /**
   * @desc      Get address suggestions
   * @route     POST /address/suggestions
   * @body 			{ query: string, target: TargetType, context: IAddressContext }
   * @success 	{ suggestions: SuggessionType[] | [] }
   * @access    Public
   */
  getAddressSuggestions = async (req: Request, res: Response) => {
    try {
      const query: string = req.body?.query;
      const target: IAddressTarget = req.body?.target;
      const bound: IAddressBound = req.body?.bound;
      const count: number = req.body?.count;
      const context: IAddressContext = {
        settlementFiasId: req.body?.context?.settlementFiasId,
      };

      delete context[target];
      delete context[`${target}FiasId`];

      let locations = [{ country_iso_code: 'ru', ...context }];
      if (locations[0].settlementFiasId) {
        // search address within a settlement as a city as well
        locations.push({
          ...locations[0],
          cityFiasId: locations[0].settlementFiasId,
        });
        delete locations[1].settlementFiasId;
      }

      locations = locations.map(location => tranformObjectKeysToSnakeCase(location));

      const {
        data: { suggestions },
      } = await axios({
        method: 'post',
        url: 'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Token ${DADATA_TOKEN}`,
        },
        data: {
          query,
          count,
          language: 'ru',
          locations,
          from_bound: { value: bound ? bound?.from || target : target },
          to_bound: { value: bound ? bound?.to || target : target },
          restrict_value: true,
        },
      });

      const sortedSuggestions = suggestions.map(item => {
        let value: string = null;

        switch (target) {
          case 'settlement': // get settlement name with region and area
            value = item.unrestricted_value;
            if (!!parseInt(value.split(', ')[0])) value = value.split(', ').slice(1).join(', ');
            break;
          case 'street': // get full street name
            value = [
              item.data.settlement_fias_id !== context?.settlementFiasId ? item.data.settlement_with_type : '',
              item.data.street_with_type,
            ]
              .filter((str: string) => !!str?.length)
              .join(', ')
              .trim();
            break;
          default:
            value = item.data[`${target || bound?.from}_with_type`] || item.value;
        }
        return {
          value,
          fiasId: item.data.fias_id,
          context: transformObjectKeysCase(item.data, 'camelCase'),
        };
      });

      return APIResponse({
        res,
        data: { suggestions: sortedSuggestions },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка сервера',
        error: err,
      });
    }
  };
}

export default AddressCtrl;
