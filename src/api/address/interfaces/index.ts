export interface IAddress {
  id?: string;
  country?: string;
  region?: string;
  regionFiasId?: string;
  area?: string;
  areaFiasId?: string;
  city?: string;
  cityFiasId?: string;
  settlement?: string;
  settlementFiasId?: string;
  street?: string;
  building?: string;
  apartment?: string;
  flat?: string;
  postcode?: string;
}

export interface IAddressContext {
  countryFiasId?: string;
  regionFiasId?: string;
  areaFiasId?: string;
  cityFiasId?: string;
  settlementFiasId?: string;
  streetFiasId?: string;
  buildingFiasId?: string;
  apartmentFiasId?: string;
  // country?: string; // Страна
  // region?: string; // Регион
  // area?: string; // Область
  // city?: string; // Город
  // settlement?: string; // Населённый пункт
  // street?: string; // Улица
  // house?: string; // Дом
  // flat?: string; // Квартира
}

export type IAddressTarget = 'country' | 'region' | 'area' | 'city' | 'settlement' | 'street' | 'house' | 'flat';

export type IAddressSuggesstion = {
  display: string;
  value: string;
  value_with_type?: string;
};

export interface IAddressBound {
  from: IAddressTarget;
  to: IAddressTarget;
}
