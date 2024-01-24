import { IAddress } from './interfaces';

/**
 * @description Sets settlement from city's value instead of empty value
 * @param address {IAddress}
 * @returns {IAddress}
 */
export const transformAddress = (address: IAddress): IAddress => {
  if (!address) return address;
  return {
    ...address,
    settlement: address?.settlement || address?.city,
    settlementFiasId: address?.settlementFiasId || address?.cityFiasId,
  };
};
