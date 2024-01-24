import axios from 'axios';
import _ from 'lodash';
import { OTHER_URL_COMPANY } from '../data';


class GET_SITY_SERVICE {
  getCitiesNrg = async (url: string): Promise<any> => {
    const citiesArray = await axios.get(url);

    return citiesArray.data;
  };

  getCityId = (citiList: any, city: string): Number => {
    let id;

    // пробегаемся по списку городов, находим нужный нам и берем его id
    _.forEach(citiList, function (obj: any) {
      const nameCity = obj.name.toUpperCase();
      if (city.toUpperCase() === nameCity) {
        id = obj.id;
      }
    });

    return id;
  };

  getKladrShiptor = async ( address: string ): Promise<string> => {
    try {
      const kladr = await axios.post(OTHER_URL_COMPANY.SHIPTOR_KLADR, {
        "id": "JsonRpcClient.js",
        "jsonrpc": "2.0",
        "method": "suggestSettlement",
        "params": {
          "query": address,
          "parent": "36000000000",
          "country_code": "RU"
        }
      })

      return kladr.data.result[0].kladr_id
    } catch (e) {
      console.log(e)
      console.log('Ошибка получения КЛАДР Shiptor')
    }
  }

}

export default GET_SITY_SERVICE;