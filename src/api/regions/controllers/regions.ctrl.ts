import { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op, Sequelize, WhereOptions } from 'sequelize';
import _ from 'lodash';
import { APIError, APIResponse } from '../../../utils/api.utils';
import Region from '../models/Region.model';
import SelectedRegions from '../models/SelectedRegions.model';
import SelectedSettlements from '../models/SelectedSettlements.model';
import Settlement from '../models/Settlement.model';
import { setSelectedRegionsSettlements } from '../services/setSelectedRegionsSettlements';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Address from '../../address/models/Address.model';
import { Sale } from '../../catalog/models/Sale.model';

class RegionsCtrl {
  /**
   * @description Get regions list.
   * @route GET /regions
   * @success { regions: Regions[]; count: number; }
   * @memberof RegionsCtrl
   */
  getRegions = async (req: Request, res: Response) => {
    try {
      const mode = req?.query?.mode as 'sale';

      const regionEntities = await Region.findAll({
        order: [[Sequelize.fn('lower', Sequelize.col('name_with_type')), 'ASC']],
      });
      const validBranches = await OrganizationBranch.findAll({
        where: {
          confirmationDate: { [Op.ne]: null },
        },
        include: [
          {
            model: OrganizationSeller,
            as: 'sellers',
            where: {
              confirmationDate: {
                [Op.ne]: null,
              },
            },
            limit: 1,
            required: true,
          },
          {
            model: Address,
            as: 'actualAddress',
            required: true,
            include: mode === 'sale' ? [{ model: Sale, as: 'sales', required: true }] : null,
          },
        ],
      });

      const regions = regionEntities
        .filter(({ name }) => name !== 'Байконур')
        .map(region => ({
          ...(region.toJSON() as Region),
          organizationBranchCount:
            validBranches.filter(({ actualAddress: { regionFiasId } }) => regionFiasId === region.fias_id)?.length || 0,
        }));

      return APIResponse({
        res,
        data: regions,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Regions not loaded',
        error: err,
      });
    }
  };
  /**
   * @description Get childs of region or settlement
   * @route GET /regions/:parentguid
   * @success { regions: Regions[]; count: number; }
   * @memberof RegionsCtrl
   */
  getSettlements = async (req: Request, res: Response) => {
    try {
      const { parentguid } = req.params;
      const mode = req?.query?.mode as 'sale';
      const whereOrgBranch: WhereOptions = {
        confirmationDate: {
          [Op.ne]: null,
        },
      };

      const addresses = await Address.findAll({
        where: {
          regionFiasId: parentguid,
        },
        include: [
          {
            model: OrganizationBranch,
            as: 'organizationBranchesByActualAddress',
            where: whereOrgBranch,
            required: true,
            include: [
              {
                model: OrganizationSeller,
                as: 'sellers',
                where: {
                  confirmationDate: {
                    [Op.ne]: null,
                  },
                },
              },
            ],
          },
          mode === 'sale' && { model: Sale, as: 'sales', required: true, limit: 1 },
        ].filter(Boolean),
      });

      const entities = {
        cities: await Settlement.findAll({
          // where: {
          //   parentguid,
          // },
          include: [
            {
              model: Address,
              as: 'addressCityFiasIdByAoguid',
              where: {
                id: addresses.map(el => el.id),
              },
              required: true,
            },
          ],
        }),
        settlements: await Settlement.findAll({
          // where: {
          //   parentguid,
          // },
          include: [
            {
              model: Address,
              as: 'addressSettlementsFiasIdByAoguid',
              where: {
                id: addresses.map(el => el.id),
              },
              required: true,
            },
          ],
        }),
      };

      let settlements = _.uniqBy([...entities.cities, ...entities.settlements], 'aoguid');
      settlements = settlements.map(settlement => settlement.toJSON()) as any;

      settlements = settlements.map(settlement => ({
        ...settlement,
        organizationBranchCount:
          (settlement?.addressCityFiasIdByAoguid?.length || 0) +
          (settlement?.addressSettlementsFiasIdByAoguid?.length || 0),
      })) as any;

      return APIResponse({
        res,
        data: settlements,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Regions not loaded',
        error: err,
      });
    }
  };
  /**
   * @description Save selected regions and settlements
   * @route POST /regions/selected
   * @success { regions: Regions[] }
   * @memberof RegionsCtrl
   */
  setSelectedRegionsSettlements = async (req: Request, res: Response) => {
    try {
      const { settlements: data, orderRequestId }: any = req.body;
      await setSelectedRegionsSettlements({ data, orderRequestId });

      return APIResponse({
        res,
        data: {
          message: 'Населенные пункты сохранены',
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Regions not saved',
        error: err,
      });
    }
  };
  /**
   * @description Get all users selected regions and settlements.
   * @route GET /regions/selected
   * @success { SelectedSettlements[] & SelectedRegions[] }
   * @memberof RegionsCtrl
   */
  getSelectedRegionsSettlements = async (req: Request, res: Response) => {
    try {
      const { orderRequestId } = req.query;
      const selectedSettlements: SelectedSettlements[] = await SelectedSettlements.findAll({
        include: [
          {
            model: Settlement,
            attributes: [[seq.literal('aoid'), 'id'], 'parentguid', 'offname'],
          },
        ],
        where: {
          orderRequestId: orderRequestId || { [Op.ne]: null },
        },
        attributes: ['fiasId'],
      });

      const selectedRegions: SelectedRegions[] = await SelectedRegions.findAll({
        include: [
          {
            model: Region,
            attributes: [[seq.literal('fias_id'), 'id'], 'name_with_type'],
          },
        ],
        where: {
          orderRequestId: orderRequestId || { [Op.ne]: null },
        },

        attributes: ['fiasId'],
      });

      return APIResponse({
        res,
        data: [...selectedSettlements, ...selectedRegions],
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Regions not loaded',
        error: err,
      });
    }
  };
}

export default RegionsCtrl;
