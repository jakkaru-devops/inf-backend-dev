import Settlement from '../models/Settlement.model';

type TResponseItem = {
  aoguid: string;
  parentguid: string;
  aoid: string;
};

export interface IGetAllParentSettlementsProps {
  data: string[];
}

export interface IGetAllParentSettlements {}
/**
 * @description Get all settlement parents by array of settlements.
 * @params {data}
 * @returns {Promise<TResponseItem[]>} { aoguid, parentguid, aoid }[]
 */

export const getAllParentSettlements = async ({ data }: IGetAllParentSettlementsProps): Promise<TResponseItem[]> => {
  if (!data || !data.length) return [];

  const whereOptions = data.map(fiasId => `aoid = '${fiasId}'`).join(' OR ');
  const allParentSettlements: any = await Settlement.sequelize.query(`
    WITH RECURSIVE included_childs(aoguid, parentguid, aoid) AS
    (SELECT aoguid, parentguid, aoid
    FROM "Settlements"
	 WHERE ${whereOptions}
        UNION
    SELECT c.aoguid, c.parentguid, c.aoid
    FROM included_childs ch, "Settlements" c
    WHERE c.aoguid = ch.parentguid
  )
    SELECT *
    FROM included_childs
`);

  return allParentSettlements[0];
};
