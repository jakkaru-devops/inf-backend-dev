import { OTHER_URL_COMPANY, TOKEN_GTDEL } from '../data';
import GET_SITY_SERVICE from './getSities';
import axios from 'axios';
import qs from 'qs';
import { FROM_CITY_EXPRESS, TO_SITY_EXPRESS } from '../utils';
import _ from 'lodash';

const FormData = require('form-data');

const OTHER_FNC = new GET_SITY_SERVICE();

export const createBodyNrg = async body => {
  try {
    const cities = await OTHER_FNC.getCitiesNrg(OTHER_URL_COMPANY.GET_CITIES_NRG);
    const cityList = cities.cityList;

    const idCityFrom = await OTHER_FNC.getCityId(cityList, body.from_address);
    const idCityTo = await OTHER_FNC.getCityId(cityList, body.to_address);

    const dataNrg = {
      cover: 0,
      idCurrency: 1,
      idCityFrom: idCityFrom,
      idCityTo: idCityTo,
      declaredCargoPrice: 1,
      items: [{
        'weight': Number(body.weight),
        'width': Number(body.width),
        'length': Number(body.length),
        'height': Number(body.height),
      }],
      CityFromServices: [],
    };

    return dataNrg;
  } catch (err) {
    console.error(err);
  }
};

export const createBodyBaikal = async body => {
  try {
    const encTextFrom = encodeURI(body.from_address);
    const encTextTo = encodeURI(body.to_address);

    const idCityFromB = await axios.get(OTHER_URL_COMPANY.BAIKAL_ID_SITY + encTextFrom);
    const idCityToB = await axios.get(OTHER_URL_COMPANY.BAIKAL_ID_SITY + encTextTo);

    const fromQuid = idCityFromB.data[0].guid;
    const fromTitle = idCityFromB.data[0].title;

    const toQuid = idCityToB.data[0].guid;
    const toTitle = idCityToB.data[0].title;

    const obj = qs.parse(
      'from[guid]=' +
      fromQuid +
      '&from[title]=' +
      fromTitle +
      '&from[real_guid]=' +
      fromQuid +
      '&from[parent_guid]=' +
      fromQuid +
      '&from[delivery]=' +
      body.weight +
      '&to[guid]=' +
      toQuid +
      '&to[title]=' +
      toTitle +
      '&to[real_guid]=' +
      toQuid +
      '&to[parent_guid]=' +
      toQuid +
      '&to[delivery]=1&cargo[0][weight]=' +
      body.weight +
      '&cargo[0][volume]=' +
      body.width * body.height * body.length +
      '&cargo[0][length]=' +
      body.length +
      '&cargo[0][width]=' +
      body.width +
      '&cargo[0][height]=' +
      body.height +
      '&' +
      'source=main_calc_full&transport_type[]=avia',
    );

    const dataBaikal = qs.stringify(obj);

    return dataBaikal;
  } catch (e) {
    console.log(e);
  }
};

export const createBodyDellin = async body => {
  try {
    const encTextFrom = encodeURI(body.from_address);
    const encTextTo = encodeURI(body.to_address);

    const idCityFromD = await axios.get(OTHER_URL_COMPANY.DELLIN_ID_SITY + encTextFrom);
    const idCityToD = await axios.get(OTHER_URL_COMPANY.DELLIN_ID_SITY + encTextTo);

    return {
      idFrom: idCityFromD.data[0].code,
      idTo: idCityToD.data[0].code,
    };
  } catch (err) {
    console.error(err);
  }
};

export const createBodyGdell = async body => {
  try {
    const cityFrom = await axios.post(
      OTHER_URL_COMPANY.GTDEL_GET_SITY,
      { title: body.from_address, },
      {
        headers: {
          Authorization: `Bearer ${TOKEN_GTDEL}`,
        },
      },
    );

    const cityTo = await axios.post(
      OTHER_URL_COMPANY.GTDEL_GET_SITY,
      { title: body.to_address, },
      {
        headers: {
          Authorization: `Bearer ${TOKEN_GTDEL}`,
        },
      },
    );

    const dataGtdell = {
      city_pickup_code: cityFrom.data[0].code,
      city_delivery_code: cityTo.data[0].code,
      declared_price: '1000',
      currency_code: ['RUB'],
      places: [
        {
          count_place: '1',
          height: body.height * 100,
          width: body.width * 100,
          length: body.length * 100,
          weight: body.weight * 100,
        },
      ],
    };

    return dataGtdell;
  } catch (e) {
    console.log(e);
  }
};

export const createBodyJde = body => {
  try {

    const url = '?from=' + body.from_address
      + '&to=' + body.to_address
      + '&weight=' + body.weight
      + '&volume=' + body.width * body.length * body.height
      + '&type=1&smart=1';

    const encodeUrl = encodeURI(url);

    return encodeUrl;
  } catch (e) {
    console.log(e);
  }
};

export const createBodyPonyExpress = body => {
  try {
    const bodyFormData = new FormData();

    const formData = {
      'parcel[currency_id]': '4',
      'parcel[tips_iblock_code]': 'form_tips',
      'parcel[tips_section_code]': 'pegas',
      'parcel[direction]': 'inner',
      'parcel[from_country]': 'Россия',
      'parcel[from_city]': body.from_address,
      'parcel[to_country]': 'Россия',
      'parcel[to_city]': body.to_address,
      'parcel[weight]': body.weight,
      'parcel[usecurrentdt]': '0',
      'parcel[kgo]': '0',
      'parcel[og]': '0',
      'parcel[isdoc]': '0',
    };

    for (const key in formData) {
      bodyFormData.append(key, formData[key]);
    }

    return bodyFormData;
  } catch (e) {
    console.log(e);
  }
};

export const createBodyExpressAuto = body => {
  try {
    const volume = body.length * body.height * body.width;

    let from;
    let to;
    _.forEach(FROM_CITY_EXPRESS, function(value) {
      if (value.name === body.from_address) {
        from = value.id;
      }
    });

    _.forEach(TO_SITY_EXPRESS, function(value) {
      if (value.name === body.to_address) {
        to = value.id;
      }
    });

    const params = new URLSearchParams();
    const formData = {
      'act': 'getPrice',
      'cfId': String(from),
      'ctId': String(to),
      'volume': String(volume),
      'weight': String(body.weight),
    };
    for (const key in formData) {
      params.append(key, formData[key]);
    }

    return params;
  } catch (e) {
    console.log(e);
  }
};

export const createBodyShiptor = async body => {
  try {
    const fromKladr = await OTHER_FNC.getKladrShiptor(body.from_address)
    const toKladr = await OTHER_FNC.getKladrShiptor(body.to_address)

    const params = {
      "id": "JsonRpcClient.js",
      "jsonrpc": "2.0",
      "method": "calculateShipping",
      "params": {
        "stock": true,
        "courier": "shiptor",
        "kladr_id_from": fromKladr,
        "kladr_id": toKladr,
        "length": body.length,
        "width": body.width,
        "height": body.height,
        "weight": body.weight,
        "cod": 0,
        "declared_cost": 0
    }
    }

    return params;
  } catch (e) {
    console.log(e);
  }
};