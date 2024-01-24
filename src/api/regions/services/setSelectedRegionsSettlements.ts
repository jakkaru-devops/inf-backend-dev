import { Transaction } from 'sequelize';
import SelectedRegions from '../models/SelectedRegions.model';
import SelectedSettlements from '../models/SelectedSettlements.model';

interface IProps {
  data: any;
  orderRequestId: string;
  transaction?: Transaction;
}

export const setSelectedRegionsSettlements = async ({ data, orderRequestId, transaction }: IProps) => {
  const regions = data
    .filter(item => item.fias_id)
    .map(region => ({
      orderRequestId,
      fiasId: region.fias_id,
      amount: 1,
    }));
  const settlements = data
    .filter(item => item.aoguid)
    .map(settlement => ({
      orderRequestId,
      fiasId: settlement.aoid,
      regionId: settlement.regionId,
      amount: 1,
    }));

  await SelectedRegions.destroy({ where: { orderRequestId }, transaction });
  await SelectedSettlements.destroy({ where: { orderRequestId }, transaction });

  await SelectedRegions.bulkCreate(regions, { ignoreDuplicates: true, transaction });
  await SelectedSettlements.bulkCreate(settlements, { ignoreDuplicates: true, transaction });
};
