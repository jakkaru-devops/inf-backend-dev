import { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import Organization from '../models/Organization.model';
import Notification from '../../notification/models/Notification.model';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import User from '../../user/models/User.model';
import Address from '../../address/models/Address.model';
import { IOrganization, IOrganizationData } from '../interfaces';
import { getOrgName, getOrgStatus, getOrganizationComission } from '../utils';
import OrganizationBranch from '../models/OrganizationBranch.model';
import OrganizationRejection from '../models/OrganizationRejection.model';
import OrganizationSeller from '../models/OrganizationSeller.model';
import OrganizationSellerRejection from '../models/OrganizationSellerRejection.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import { updateOrganizationService } from '../services/updateOrganization.service';
import UserRoles from '../../role/models/UserRoles.model';
import { transformAddress } from '../../address/utils';
import SocketIO from 'socket.io';
import { createNotification } from '../../notification/services/createNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import { getPaginationParams } from '../../../utils/common.utils';
import Order from '../../order/models/Order.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import SellerUpdateApplication from '../../user/models/SellerUpdateApplication.model';
import { getOrganizationUpdateApplicationService } from '../services/getOrganizationUpdateApplication.service';
import { confirmOrganizationUpdateApplicationService } from '../services/confirmOrganizationUpdateApplication.service';
import { rejectOrganizationUpdateApplicationService } from '../services/rejectOrganizationUpdateApplication.service';
import OrganizationUpdateApplication from '../models/OrganizationUpdateApplication.model';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';
import { getSellerOrganizationsBranchesService } from '../services/getSellerOrganizationsBranches.service';
import usersService from '../../user/services';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import organizationsService from '../organizations.service';

class OrganizationCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }

  /**
   * @desc      Get list of organizations
   * @route     GET /organization/list
   * @query 		{ pageSize?: number, page?: number, search?: string }
   * @success 	{ count: number, rows: Organization[] }
   * @access    Private: manager
   */
  getOrganizationList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const options: seq.FindAndCountOptions = {
        ...getPaginationParams(req.query, 12),
        distinct: true, // for exact filtering
        order: [
          [{ model: Notification, as: 'notifications' }, 'createdAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
        include: [],
      };
      options.where = {
        [Op.and]: [],
      };

      const whereAddress: seq.WhereOptions = {
        [Op.and]: [],
      };
      const whereSeller: seq.WhereOptions = {
        detachedAt: null,
      };

      // Search by inn or name
      if (query.search) {
        options.where[Op.and].push({
          [Op.or]: [
            {
              inn: query.search,
            },
            {
              name: {
                [Op.or]: [
                  { [Op.iLike]: `%${query.search}%` },
                  { [Op.iLike]: `%${getOrgName({ name: query.search as string }, true, false)}%` },
                ],
              },
            },
          ],
        });
      }
      // Search by region
      if (query.region && (query.region as string).trim().length > 0) {
        whereAddress[Op.and].push({
          region: {
            [Op.iLike]: `%${query.region}%`,
          },
        });
      }
      // Search by city
      if (query.city && (query.city as string).trim().length > 0) {
        whereAddress[Op.and].push({
          [Op.or]: [
            {
              city: {
                [Op.iLike]: `%${query.city}%`,
              },
            },
            {
              settlement: {
                [Op.iLike]: `%${query.city}%`,
              },
            },
          ],
        });
      }
      if (query.sellerUserId) {
        whereSeller.userId = query.sellerUserId;
      }
      if (query.confirmed === 'true') {
        options.where[Op.and].push({
          confirmationDate: {
            [Op.ne]: null,
          },
        });
      }

      // Relations
      options.include.push(
        {
          model: OrganizationSeller,
          as: 'sellers',
          required: !!query.sellerUserId, // required only while gettings organizations of certain seller
          where: whereSeller,
          attributes: ['id', 'confirmationDate'],
          include: [
            {
              model: User,
              as: 'user',
              include: [
                {
                  model: SellerUpdateApplication,
                  as: 'sellerUpdateApplication',
                  required: false,
                  where: {
                    rejectedAt: null,
                    confirmedAt: null,
                  },
                },
              ],
            },
            {
              model: OrganizationSellerRejection,
              as: 'rejections',
            },
          ],
        },
        {
          model: OrganizationBranch,
          as: 'branches',
          required: false,
          separate: true,
          attributes: ['id', 'confirmationDate', 'isMain'],
        },
        {
          model: OrganizationRejection,
          as: 'rejections',
          required: false,
          separate: true,
          limit: 1,
          attributes: ['id', 'message', 'createdAt'],
        },
        {
          model: Address,
          as: 'juristicAddress',
          required: true,
          attributes: ['id', 'region', 'city', 'settlement'],
          where: whereAddress,
        },
        {
          model: Notification,
          as: 'notifications',
          where: {
            userId: authUser.id,
            roleId: authUserRole.roleId,
          },
          required: false,
        },
        {
          model: Notification,
          as: 'unreadNotifications',
          where: {
            userId: authUser.id,
            roleId: authUserRole.roleId,
            viewedAt: null,
            type: {
              [Op.ne]: ENotificationType.dummy,
            },
          },
          required: false,
        },
        {
          model: OrganizationUpdateApplication,
          as: 'updateApplications',
          required: false,
          separate: true,
          where: {
            rejectedAt: null,
            confirmedAt: null,
          },
        },
      );

      // Db request
      const organizations = await Organization.findAndCountAll(options);

      // Handle organization list
      organizations.rows = organizations.rows
        .map(org => org.toJSON() as Organization)
        .map(
          org =>
            ({
              ...org,
              ...getOrganizationComission(org),
              status: getOrgStatus(org),
              name: getOrgName(org, true, true),
              sellers: !!query.sellerUserId ? org.sellers : org.sellers.filter(seller => !!seller.confirmationDate),
              branches: org.branches.filter(el => !!el.confirmationDate && !el.isMain),
              rejections: null,
            } as IOrganization),
        );

      return APIResponse({
        res,
        data: organizations,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Список организаций не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get organization by id
   * @route     GET /organization
   * @query 		{ id: string }
   * @success 	Organization
   * @access    Private: manager
   */
  getOrganization = createAPIMethod(
    { errorMessage: 'Данные организации не загружены', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { id } = req.query as any;
      const organization = await organizationsService.getOrganization({ id, authUser, authUserRole });
      return organization;
    },
  );

  /**
   * @desc      Create organization
   * @route     POST /organization
   * @body 			{ org: Organization }
   * @success 	{ organization: Organization, orgSeller?: OrganizationSeller, message: string }
   * @access    Private: seller
   */
  createOrganization = createAPIMethod(
    { errorMessage: 'Организация не добавлена', runTransaction: true },
    async ({ req, authUser, authUserRole, transaction }) => {
      const orgData: Organization = req.body.org;
      const sellerData: { userId: string } = req.body.personal;
      const { org, orgSeller } = await organizationsService.createOrganization(
        {
          orgData,
          authUser,
          authUserRole,
          sellerData,
        },
        { io: this.io, transaction },
      );
      return {
        org,
        orgSeller,
        message: 'Организация добавлена',
      };
    },
  );

  /**
   * @desc      Update organization data
   * @route     PUT /organization
   * @body 			{ org: Organization }
   * @success 	{ organization: Organization, message: string }
   * @access    Private: manager, seller
   */
  updateOrganization = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const orgData: Organization = req.body.org;

      const { org: updatedOrganization } = await updateOrganizationService({
        orgData,
        authUser,
        authUserRole,
        io: this.io,
        res,
        transaction,
      });

      return APIResponse({
        res,
        data: {
          organization: updatedOrganization,
          message: 'Данные организации обновлены',
        },
      });
    });
  };

  /**
   * @desc      Delete organization
   * @route     DELETE /organization
   * @body 			{ id: string }
   * @success 	{ message: string }
   * @access    Private: manager
   */
  deleteOrganization = createAPIMethod(
    { errorMessage: 'Ошибка при удалении организации', runTransaction: true },
    async ({ req, res, transaction }) => {
      const { id } = req.body;

      const organization = await Organization.findByPk(id, { transaction });
      if (!organization)
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Организация не найдена',
        });

      await organization.destroy({
        transaction,
      });

      return {
        message: 'Организация удалена',
      };
    },
  );

  /**
   * @desc      Search organization by INN.
   * @route     GET /organization/by-inn
   * @body 			{ id: string }
   * @success 	IOrganizationByInn
   * @access    Private: seller
   */
  searchOrganizationByInn = createAPIMethod(
    { errorMessage: 'Ошибка при поиске организации по ИНН', runTransaction: false },
    async ({ req, res, authUser }) => {
      const { search, type } = req.query as any;

      const organization = await organizationsService.searchOrganizationByInn({ inn: search, type, authUser });

      if (!organization)
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Организация не найдена',
        });

      return organization;
    },
  );

  /**
   * @desc      Confirm organization
   * @route     POST /organization/confirm
   * @body 			{ orgData: Organization }
   * @success 	{ organization: Organization, message: string }
   * @access    Private: manager
   */
  confirmOrganization = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const orgData: Organization = req.body.org;

        // Mark branches as confirmed
        orgData.branches = orgData.branches.map(
          branch =>
            ({
              ...branch,
              confirmationDate: new Date(),
            } as OrganizationBranch),
        );

        const { org: updatedOrganization } = await updateOrganizationService({
          orgData: {
            ...orgData,
            confirmationDate: new Date(),
          } as Organization,
          authUser,
          authUserRole,
          io: this.io,
          res,
          transaction,
        });

        await createNotification({
          userId: updatedOrganization.creatorUserId,
          role: 'seller',
          type: ENotificationType.organizationRegisterConfirmed,
          autoread: true,
          organizationId: updatedOrganization.id,
          data: {
            organization: {
              id: updatedOrganization.id,
              name: getOrgName(updatedOrganization, true, true),
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            organization: updatedOrganization,
            message: 'Организация подтверждена',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при подтверждении организации',
        });
      }
    });
  };

  /**
   * @desc      Reject organization
   * @route     POST /organization/reject
   * @body 			{ id: string, message: string }
   * @success 	{ rejection: OrganizationRejection, message: string }
   * @access    Private: manager
   */
  rejectOrganization = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id: string = req.body.id;
        const message: string = req.body.message;

        const organization = await Organization.findByPk(id, {
          transaction,
        });
        if (!!organization.confirmationDate) {
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Организация уже подтверждена',
          });
        }

        const notRespondedRejection = await OrganizationRejection.findOne({
          where: {
            organizationId: organization.id,
            isResponded: false,
          },
          transaction,
        });
        // If there is not responded rejection already
        if (notRespondedRejection) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Отказ на регистрацию организации уже отправлен ранее',
          });
        }

        // Create org rejection
        const rejection = await OrganizationRejection.create(
          {
            organizationId: organization.id,
            message,
          },
          {
            transaction,
          },
        );

        await createNotification({
          userId: organization.creatorUserId,
          role: 'seller',
          type: ENotificationType.organizationRegisterRejected,
          autoread: true,
          organizationId: organization.id,
          data: {
            organization: {
              id: organization.id,
              name: getOrgName(organization, true, true),
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            rejection,
            message: 'Заявка на регистрацию организации отклонена',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при отклонении заявки на регистрацию организации',
        });
      }
    });
  };

  /**
   * @desc      Create organization seller
   * @route     POST /organization/seller
   * @body 			{ org: any, selectedBranch: OrganizationBranch }
   * @success 	{ orgSeller: OrganizationSeller, message: string }
   * @access    Private: seller | manager
   */
  createOrganizationSeller = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const authUserRole: UserRoles = req.body.authUserRole;
      try {
        const authUser: User = req.body.authUser;
        const orgData: Organization = req.body.org;
        const selectedBranchData: OrganizationBranch = req.body.org.selectedBranch;
        let selectedBranch: OrganizationBranch = null;

        // Find org
        const org = await Organization.findByPk(orgData.id, {
          include: [{ model: OrganizationBranch, as: 'branches' }],
          transaction,
        });

        // If user provided selected org branch that
        if (!!selectedBranchData) {
          // Set branch from list of already created
          if (org.branches.findIndex(branch => branch.id === selectedBranchData.id) !== -1) {
            selectedBranch = selectedBranchData;
          } else {
            // Create address for branch office
            const address = await Address.create(transformAddress(selectedBranchData.actualAddress), {
              transaction,
            });
            // Create branch
            selectedBranch = await OrganizationBranch.create(
              {
                organizationId: org.id,
                actualAddressId: address.id,
                creatorUserId: authUser.id,
                confirmationDate: ['manager', 'operator'].includes(authUserRole?.role?.label) ? new Date() : null,
                kpp: selectedBranchData.kpp,
                bankName: selectedBranchData.bankName,
                bankInn: selectedBranchData.bankInn,
                bankBik: selectedBranchData.bankBik,
                bankKs: selectedBranchData.bankKs,
                bankRs: selectedBranchData.bankRs,
              },
              {
                transaction,
              },
            );
          }
        } else {
          selectedBranch = org.branches.find(el => el.isMain);
        }

        // Create org seller
        let orgSeller: OrganizationSeller;
        if (authUserRole.role.label === 'seller' && !authUser?.sellers?.some(seller => !!seller.confirmationDate)) {
          await User.update(
            {
              sellerRegisterOrganizationId: org.id,
              sellerRegisterOrganizationBranchId: selectedBranch.id,
            },
            {
              where: { id: authUser.id },
              transaction,
            },
          );
        } else {
          orgSeller = await OrganizationSeller.create(
            {
              organizationId: org.id,
              userId: authUser.id,
              branchId: selectedBranch.id,
              confirmationDate: ['manager', 'operator'].includes(authUserRole?.role?.label) ? new Date() : null,
            },
            { transaction },
          );
        }

        return APIResponse({
          res,
          data: {
            orgSeller,
            message: authUserRole.role.label === 'seller' ? 'Заявка отправлена' : 'Продавец зарегистрирован',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message:
            authUserRole.role.label === 'seller' ? 'Ошибка при отправке заявки' : 'Ошибка при регистрации продавца',
        });
      }
    });
  };

  getSellerOrganizationsBranches = async (req: Request, res: Response) => {
    try {
      const sellerId = req.query?.sellerId as string;
      const { branches } = await getSellerOrganizationsBranchesService({ sellerId, res });

      return APIResponse({
        res,
        data: {
          branches,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Список филиалов продавца не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Confirm organization seller
   * @route     POST /organization/seller/confirm
   * @body 			{ id: string }
   * @success 	{ message: string }
   * @access    Private: manager
   */
  confirmOrganizationSeller = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const userId: string = req.body.userId;
        const organizationId: string = req.body.organizationId;

        let orgSeller = await OrganizationSeller.findOne({
          where: {
            userId,
            organizationId,
          },
          transaction,
        });
        let user = await User.findByPk(userId, {
          transaction,
        });

        // Update org seller
        orgSeller = await orgSeller.update({ confirmationDate: new Date() }, { transaction });

        if (!user.sellerConfirmationDate) {
          // Mark user as confirmed in one organization at least
          user = await user.update({ sellerConfirmationDate: new Date() }, { transaction });
        }

        const orgBranchId = !!user?.sellerConfirmationDate
          ? orgSeller.branchId
          : user?.sellerRegisterOrganizationBranchId || orgSeller.branchId;
        let orgBranch = await OrganizationBranch.findByPk(orgBranchId, { transaction });
        if (!orgBranch.confirmationDate) {
          orgBranch = await orgBranch.update({ confirmationDate: new Date() }, { transaction });
        }

        const org = await Organization.findByPk(organizationId, {
          transaction,
        });

        await createNotification({
          userId: user.id,
          role: 'seller',
          type: ENotificationType.organizationSellerRegisterConfirmed,
          autoread: true,
          organizationId,
          data: {
            organization: {
              id: organizationId,
              name: getOrgName(org, true, true),
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            message: 'Продавец подтвержден',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при подтверждении продавца',
        });
      }
    });
  };

  /**
   * @desc      Reject organization seller
   * @route     POST /organization/seller/reject
   * @body 			{ organizationId: string, userId: string, message: string }
   * @success 	{ rejection: OrganizationSellerRejection, message: string }
   * @access    Private: manager
   */
  rejectOrganizationSeller = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const organizationId: string = req.body.organizationId;
        const userId: string = req.body.userId;
        const message: string = req.body.message;

        const orgSeller = await OrganizationSeller.findOne({
          where: {
            organizationId,
            userId,
          },
          attributes: ['id', 'organizationId', 'confirmationDate'],
          transaction,
        });
        if (!!orgSeller.confirmationDate) {
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Продавец уже подтвержден',
          });
        }

        // Get organization
        const organization = await Organization.findByPk(orgSeller.organizationId as string, {
          attributes: ['id'],
          transaction,
        });

        const notRespondedRejection = await OrganizationSellerRejection.findOne({
          where: {
            organizationSellerId: orgSeller.id,
            isResponded: false,
          },
          transaction,
        });
        // If there is not responded rejection already
        if (notRespondedRejection) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Отказ на регистрацию продавца уже отправлен ранее',
          });
        }

        const rejection = await OrganizationSellerRejection.create(
          {
            organizationId: organization.id,
            organizationSellerId: orgSeller.id,
            message,
          },
          {
            transaction,
          },
        );

        await createNotification({
          userId,
          role: 'seller',
          type: ENotificationType.organizationSellerRegisterRejected,
          autoread: true,
          organizationId: organization.id,
          data: {
            organization: {
              id: organization.id,
              name: getOrgName(organization, true, true),
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            rejection,
            message: 'Заявка на регистрацию продавца отклонена',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при отклонении заявки на регистрацию продавца',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Update application to register an organization
   * @route     PUT /organization/application
   * @body 			{ org: Organization }
   * @success 	{ organization: Organization, message: string }
   * @access    Private: manager, seller
   */
  updateOrganizationApplication = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const orgData: Organization = req.body.org;

      const { org } = await updateOrganizationService({
        orgData,
        authUser,
        authUserRole,
        io: this.io,
        res,
        transaction,
      });

      // Find and set last rejection as responded
      await OrganizationRejection.update(
        {
          isResponded: true,
        },
        {
          where: {
            organizationId: org.id,
            isResponded: false,
          },
          transaction,
        },
      );

      if (authUserRole.role.label === 'seller') {
        await createNotificationForAllManagersService({
          type: ENotificationType.registerOrganizationApplicationUpdated,
          autoread: false,
          organizationId: org.id,
          data: {
            organization: {
              id: org.id,
              name: getOrgName(org, true, true),
            },
          },
          io: this.io,
          res,
          transaction,
        });
      }

      return APIResponse({
        res,
        data: {
          organization: org,
          message: 'Повторная заявка на регистрацию организации отправлена',
        },
      });
    });
  };

  updateOrganizationSellerApplication = createAPIMethod(
    { errorMessage: 'Возникла ошибка при обновлении заявки на регистрацию', runTransaction: true },
    async ({ req, transaction }) => {
      const userData: User = req.body.user;
      const orgId: string = req.body.orgId;

      const user = await usersService.updateUser({
        userData,
        transaction,
      });

      const orgSeller = await OrganizationSeller.findOne({
        where: {
          organizationId: orgId,
          userId: user.id,
        },
      });

      // Find and set last rejection as responded
      let rejection = await OrganizationSellerRejection.findOne({
        where: {
          organizationSellerId: orgSeller.id,
          organizationId: orgId,
          isResponded: false,
        },
        transaction,
      });
      await rejection.update(
        {
          isResponded: true,
        },
        {
          transaction,
        },
      );

      return {
        user,
        message: 'Повторная заявка на регистрацию продавца отправлена',
      };
    },
  );

  /**
   * @desc      Ban organization
   * @route     POST /organization/ban
   * @body      { orgId: string, isBanned: boolean }
   * @success 	{ success: boolean }
   * @access    Private: manager
   */
  banOrganization = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const orgId: string = req.body.orgId;
        const isBanned: boolean = req.body.isBanned;
        const bannedUntil = new Date();

        await Organization.update(
          {
            bannedUntil: isBanned ? bannedUntil : null,
          },
          {
            where: {
              id: orgId,
            },
            transaction: t,
          },
        );

        return APIResponse({
          res,
          data: {
            success: true,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при блокировке организации',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      get seller organization
   * @route     GET /organization/get-seller-organizations
   * @success 	{ organizations: Organization[] }
   * @access    Private: seller
   */
  getSellerOrganizationList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;

      const options: seq.FindAndCountOptions = {
        include: [],
      };

      options.where = {
        userId: authUser.id,
        detachedAt: null,
        confirmationDate: {
          [Op.ne]: null,
        },
      };
      options.include.push({
        model: Organization,
        as: 'organization',
        required: true,
        where: {
          confirmationDate: {
            [Op.ne]: null,
          },
          bannedUntil: null,
        },
      });

      const listOrganisationsId = await OrganizationSeller.findAll(options);

      if (!listOrganisationsId) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Пользователь с id ' + authUser.id + ' не состоит ни в одной организации',
        });
      }

      let organizations = await Organization.findAll({
        where: { id: listOrganisationsId.map(val => val.organizationId) },
      });
      organizations = organizations.map(
        org =>
          ({
            ...org.toJSON(),
            ...getOrganizationComission(org),
          } as Organization),
      );

      return APIResponse({
        res,
        data: organizations,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Организации не получены',
        error: err,
      });
    }
  };

  getOrganizationSeller = async (req: Request, res: Response) => {
    try {
      const organizationId = req.query?.organizationId as string;
      const userId = req.query?.userId as string;

      const seller = await OrganizationSeller.findOne({
        where: {
          organizationId,
          userId,
        },
        include: [
          {
            model: User,
            as: 'user',
            required: true,
            include: [{ model: SellerRegisterFile, as: 'sellerRegisterFiles' }],
          },
          { model: OrganizationBranch, as: 'branch', required: true },
          {
            model: OrganizationSellerRejection,
            as: 'rejections',
            required: false,
            order: [['createdAt', 'DESC']],
            limit: 1,
          },
        ],
      });

      if (!seller) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Продавец организации не найден',
        });
      }

      if (!!seller.detachedAt) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Продавец откреплен от организации',
        });
      }

      return APIResponse({
        res,
        data: seller,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Продавец организации не загружен',
      });
    }
  };

  checkOrganizationSellerActiveOrders = async (req: Request, res: Response) => {
    const authUser: User = req.body.authUser;
    const authUserRole: UserRoles = req.body.authUserRole;
    try {
      const { userId, organizationId } = req.query;

      const activeOrders = await Order.findAll({
        where: {
          sellerId: userId,
          organizationId,
        },
        include: [
          {
            model: OrderRequest,
            as: 'orderRequest',
            required: true,
            where: {
              status: ['APPROVED', 'PAID'],
            },
          },
        ],
      });
      const allSellerOrgs = await OrganizationSeller.findAll({
        where: {
          userId,
        },
      });
      if (allSellerOrgs.length === 1) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: ['manager', 'operator'].includes(authUserRole?.role?.label)
            ? `Невозможно открепить. У продавца только 1 организация`
            : `Невозможно открепиться. У Вас только 1 организация`,
        });
      }

      return APIResponse({
        res,
        data: {
          hasActiveOrders: !!activeOrders.length,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось проверить статус продавца в организации',
        error: err,
      });
    }
  };

  detachOrganizationSeller = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;

      try {
        const { userId, organizationId } = req.query;

        const organization = await Organization.findByPk(organizationId as string);

        const orgSeller = await OrganizationSeller.findOne({
          where: {
            organizationId,
            userId,
          },
          transaction,
        });
        const allSellerOrgs = await OrganizationSeller.findAll({
          where: {
            userId,
          },
          transaction,
        });
        if (allSellerOrgs.length === 1) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Невозможно открепить. У продавца только 1 организация',
          });
        }

        const activeOrders = await Order.findAll({
          where: {
            sellerId: userId,
            organizationId,
          },
          include: [
            {
              model: OrderRequest,
              as: 'orderRequest',
              required: true,
              where: {
                status: ['APPROVED', 'PAID'],
              },
            },
          ],
          transaction,
        });

        if (!!activeOrders.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: `По организации «${getOrgName(organization, true, true)}» есть незавершенные заказы.`,
          });
        }

        if (!!orgSeller?.detachedAt) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: ['manager', 'operator'].includes(authUserRole?.role?.label)
              ? 'Продавец уже откреплен от этой организации'
              : 'Вы уже откреплены от этой организации',
          });
        }

        await orgSeller.update(
          {
            detachedAt: new Date(),
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            success: true,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: ['manager', 'operator'].includes(authUserRole?.role?.label)
            ? 'Не удалось открепить продавца'
            : 'Не удалось открепиться от организации',
          error: err,
        });
      }
    });
  };

  getOrganizationUpdateApplication = async (req: Request, res: Response) => {
    const authUser: User = req.body.authUser;
    const status = req.query?.status as 'any';
    const applicationId = req.query?.applicationId as string;
    const organizationId = req.query?.organizationId as string;

    const { organizationUpdateApplication } = await getOrganizationUpdateApplicationService({
      applicationId,
      authUser,
      organizationId,
      status,
      res,
    });

    return APIResponse({
      res,
      data: {
        organizationUpdateApplication,
      },
    });
  };

  createOrganizationUpdateApplication = createAPIMethod(
    { errorMessage: 'Не удалось создать запрос на обновление данных', runTransaction: true },
    async ({ req, authUser, transaction }) => {
      const organizationId = req.query.organizationId as string;
      const organizationData: IOrganizationData = req.body.organization;

      const { organizationUpdateApplication } = await organizationsService.createOrganizationUpdateApplication(
        {
          authUser,
          organizationId,
          organizationData,
        },
        { io: this.io, transaction },
      );

      return {
        organizationUpdateApplication,
      };
    },
  );

  confirmOrganizationUpdateApplication = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const { id } = req.params;
      const organizationData: IOrganizationData = req.body.organization;

      const { organization } = await confirmOrganizationUpdateApplicationService({
        applicationId: id,
        organizationData,
        io: this.io,
        res,
        transaction,
      });

      return APIResponse({
        res,
        data: {
          organization,
        },
      });
    });
  };

  rejectOrganizationUpdateApplication = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const { id } = req.params;
      const rejectionMessage: string = req.body.rejectionMessage;

      const { organizationUpdateApplication } = await rejectOrganizationUpdateApplicationService({
        applicationId: id,
        rejectionMessage,
        io: this.io,
        res,
        transaction,
      });

      return APIResponse({
        res,
        data: {
          organizationUpdateApplication,
        },
      });
    });
  };
}

export default OrganizationCtrl;
