import Address from '../../address/models/Address.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Region from '../models/Region.model';
import Settlement from '../models/Settlement.model';
import { Op } from 'sequelize';

export interface IGetRegisterOrganizationBranchRegions {
  fias_id: string;
  count: string;
}
export interface IGetRegisterOrganizationBranchSettlements {
  aoguid: string;
  count: string;
}
/**
 * @description Get registered organization branches with count by region fias_id.
 * @returns {Promise<IGetRegisterOrganizationBranchRegions>} { fias_id, organizationBranchCount }
 */
export const getRegisterOrganizationBranchRegions = async (): Promise<IGetRegisterOrganizationBranchRegions[]> => {
  // const regionsWithValidBranches = await Regions.findAll({
  //   include: [
  //     {
  //       model: Address,
  //       as: 'addressRegionFiasIdByFiasId',
  //       include: [
  //         {
  //           model: OrganizationBranch,
  //           as: 'organizationBranchesByActualAddress',
  //           required: false,
  //           // where: {
  //           //   confirmationDate: {
  //           //     [Op.ne]: null,
  //           //   },
  //           // },
  //           include: [
  //             {
  //               model: OrganizationSeller,
  //               as: 'sellers',
  //               required: false,
  //             },
  //           ],
  //         },
  //       ],
  //     },
  //   ],
  // });
  // console.log(regionsWithValidBranches);
  const validBranches = await OrganizationBranch.findAll({
    where: {
      confirmationDate: {
        [Op.ne]: null,
      },
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
      },
      { model: Address, as: 'actualAddress', required: true },
    ],
  });
  console.log(validBranches);

  const registerOrganizationBranches: any = await Region.sequelize.query(`
      SELECT "Regions"."fias_id", COUNT("OrganizationBranch".*) AS count FROM "Regions" 
      LEFT JOIN "Address" ON "fias_id" = "regionFiasId"
      LEFT JOIN "OrganizationBranch" ON "OrganizationBranch"."actualAddressId" = "Address".id
      LEFT JOIN "OrganizationSeller" ON "OrganizationBranch"."creatorUserId" = "OrganizationSeller"."userId"
      WHERE ("OrganizationSeller"."confirmationDate" IS NOT NULL) AND ("OrganizationBranch"."confirmationDate" IS NOT NULL)
      GROUP BY "Regions"."fias_id";
`);

  return registerOrganizationBranches[0];
};
/**
 * @description Get registered organization branches with count by settlement aoguid (fias id).
 * @returns {Promise<IGetRegisterOrganizationBranchSettlements>} { aoguid, organizationBranchCount }
 */
export const getRegisterOrganizationBranchSettlements = async (): Promise<
  IGetRegisterOrganizationBranchSettlements[]
> => {
  const registerOrganizationBranches: any = await Settlement.sequelize.query(`
      SELECT "Settlements"."aoguid", COUNT("OrganizationBranch".*) AS count FROM "Settlements" 
      LEFT JOIN "Address" ON "aoguid" = "areaFiasId" OR "aoguid" = "cityFiasId" OR "aoguid" = "settlementFiasId"
      LEFT JOIN "OrganizationBranch" ON "OrganizationBranch"."actualAddressId" = "Address".id
      LEFT JOIN "OrganizationSeller" ON "OrganizationBranch"."creatorUserId" = "OrganizationSeller"."userId"
      WHERE ("OrganizationSeller"."confirmationDate" IS NOT NULL) AND ("OrganizationBranch"."confirmationDate" IS NOT NULL)
      GROUP BY "Settlements"."aoguid";
`);

  return registerOrganizationBranches[0];
};
