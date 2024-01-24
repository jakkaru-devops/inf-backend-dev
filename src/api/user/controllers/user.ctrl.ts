import { Identifier } from 'sequelize/types';
import { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import SocketIO from 'socket.io';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import User from '../models/User.model';
import Address from '../../address/models/Address.model';
import UserRoles from '../../role/models/UserRoles.model';
import Role from '../../role/models/Role.model';
import {
  generatePayload,
  sendEmail,
  sendAuthCode,
  verifyEmailCode,
  verifySMSCode,
  verifyPermissions,
} from '../../../utils/auth.utils';
import JuristicSubject from '../models/JuristicSubject.model';
import { formatPhoneNumber, getPaginationParams, getUserName } from '../../../utils/common.utils';
import { IUserRoleSimplified, IUserSimplified } from '../interfaces';
import { simplifyUser } from '../utils';
import { IUserRoleOption } from '../../role/interfaces';
import Requisites from '../models/Requisites.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import OrganizationSellerRejection from '../../organization/models/OrganizationSellerRejection.model';
import FileModel from '../../files/models/File.model';
import { EMPLOYEE_ROLES, USER_REVIEW_STATUSES } from '../data';
import TransportCompany from '../../shipping/models/TransportCompany';
import Organization from '../../organization/models/Organization.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import UserReview from '../models/UserReview.model';
import Order from '../../order/models/Order.model';
import RefundExchangeRequest from '../../order/models/RefundExchangeRequest.model';
import Complaint from '../models/Complaint.model';
import { getOrgName } from '../../organization/utils';
import { transformAddress } from '../../address/utils';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import { usersOnlineStatus } from '../../../core/userStatus';
import { ENotificationType } from '../../notification/interfaces';
import { IOrganizationInfo } from '../../organization/interfaces';
import { uploadPdf } from '../../../utils/pdf.utils';
import { createSellerUpdateApplicationService } from '../services/createSellerUpdateApplication.service';
import { confirmSellerUpdateApplicationService } from '../services/confirmSellerUpdateApplication.service';
import { rejectSellerUpdateApplicationService } from '../services/rejectSellerUpdateApplication.service';
import { getSellerUpdateApplicationService } from '../services/getSellerUpdateApplication.service';
import { updateSellerProductCategoriesService } from '../services/updateSellerProductCategories.service';
import Notification from '../../notification/models/Notification.model';
import { createUserReview } from '../services/createUserReview.service';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';
import { ORG_ENTITY_TYPES, SERVICE_ORGANIZATION_INN } from '../../organization/data';
import DeviceToken from '../models/DeviceToken.model';
import { initiateUserDeleteService } from '../services/initiateUserDelete.service';
import { cancelUserDeletionService } from '../services/cancelUserDeleteion.service';
import { deleteUserService } from '../services/deleteUser.service';
import CustomerContract from '../models/CustomerContract.model';
import CustomerContractSpecification from '../models/CustomerContractSpecification.model';
import JuristicSubjectCustomer from '../models/JuristicSubjectCustomer.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import { updateJuristicSubjectSpecialStatusService } from '../services/updateJuristicSubjectSpecialStatus.service';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import usersService from '../services';
import StockBalance from '../../catalog/models/StockBalance.model';
import DeliveryAddress from '../../address/models/DeliveryAddress.model';
import { PostponedPayment } from '../../order/models/PostponedPayment.model';

type IGetUserIncludes = (
  | 'address'
  | 'organizations'
  | 'transportCompanies'
  | 'orderRequests'
  | 'requisites'
  | 'sellerRefundsNumber'
  | 'counters'
)[];

class UsersCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }

  /**
   * @desc      Get user list
   * @route     GET /user/list
   * @query 		{ pageSize?: number, page?: number, role: IUserRoleOption | IUserRoleOption[] }
   * @success 	{ rows: User[]; count: number; }
   * @access    Private: manager
   */
  getUserList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const search = ((query?.search as string) || '').trim();
      const searchBy = (query?.searchBy || ['name', 'phone']) as ('name' | 'phone')[];
      const include = query.include as string[];
      const ids = query.ids as string[];
      const usersRole = query.role as IUserRoleOption | IUserRoleOption[];
      const autoType = query?.autoType as string;
      const autoBrands = !!query?.autoBrand ? ([].concat(query?.autoBrand) as string[]) : null;
      const productGroups = !!query?.group ? ([].concat(query?.group) as string[]) : null;
      const sort = query.sort as string;
      const options: seq.FindAndCountOptions = {
        ...getPaginationParams(query, 10),
        distinct: true,
      };
      options.where = {
        [Op.and]: [{ phoneVerificationDate: { [Op.ne]: null } }],
      };
      options.include = [];

      if (!!sort && sort === 'lf') {
        options.order = [
          ['lastname', 'ASC'],
          ['firstname', 'ASC'],
        ];
      } else {
        if (usersRole === 'customer' || usersRole === 'seller') {
          options.order = [
            [{ model: Notification, as: 'notifications' }, 'createdAt', 'DESC'],
            ['createdAt', 'DESC'],
          ];
        } else {
          options.order = [['createdAt', 'DESC']];
        }
      }

      if (!!search?.length) {
        const or: any[] = [];

        if (searchBy.includes('phone')) {
          let phone = search.replace(/[) (-]/g, '').trim();
          if (!!phone.length && phone[0] === '8') phone = phone.replace('8', '+7');

          console.log(phone);

          or.push({
            phone: { [Op.iLike]: `%${phone}%` },
          });
        }
        if (searchBy.includes('name')) {
          const fields = ['firstname', 'lastname', 'middlename'];
          const splitedName = search
            .split(' ')
            .map(el => el.trim())
            .filter(el => !!el.length);
          const options: Array<Array<{ [key: string]: string }>> = [];
          if (splitedName.length === 1) {
            for (const fieldName of fields) {
              or.push({
                [fieldName]: {
                  [Op.iLike]: `%${splitedName[0]}%`,
                },
              });
            }
          } else if (splitedName.length === 2) {
            options.push([{ firstname: splitedName[0] }, { lastname: splitedName[1] }]);
            options.push([{ firstname: splitedName[0] }, { middlename: splitedName[1] }]);
            options.push([{ lastname: splitedName[0] }, { firstname: splitedName[1] }]);
            options.push([{ lastname: splitedName[0] }, { middlename: splitedName[1] }]);
            options.push([{ middlename: splitedName[0] }, { firstname: splitedName[1] }]);
            options.push([{ middlename: splitedName[0] }, { lastname: splitedName[1] }]);
          } else if (splitedName.length === 3) {
            options.push([{ firstname: splitedName[0] }, { lastname: splitedName[1], middlename: splitedName[2] }]);
            options.push([{ firstname: splitedName[0] }, { middlename: splitedName[1], lastname: splitedName[2] }]);
            options.push([{ lastname: splitedName[0] }, { firstname: splitedName[1], middlename: splitedName[2] }]);
            options.push([{ lastname: splitedName[0] }, { middlename: splitedName[1], firstname: splitedName[2] }]);
            options.push([{ middlename: splitedName[0] }, { firstname: splitedName[1], lastname: splitedName[2] }]);
            options.push([{ middlename: splitedName[0] }, { lastname: splitedName[1], firstname: splitedName[2] }]);
          }
          for (const option of options) {
            or.push({
              [Op.and]: option.map(el => ({
                [Object.keys(el)[0]]: {
                  [Op.iLike]: `%${Object.values(el)[0]}%`,
                },
              })),
            });
          }
        }

        options.where[Op.and].push({
          [Op.or]: or,
        });
      }

      if (usersRole === 'seller') {
        options.where[Op.and].push({
          sellerConfirmationDate: {
            [Op.ne]: null,
          },
        });
      }
      if (usersRole === 'customer' || usersRole === 'seller') {
        const usersRoleEntity = await Role.findOne({
          where: {
            label: usersRole,
          },
        });
        options.include.push(
          {
            model: Notification,
            as: 'notifications',
            where: {
              userId: authUser.id,
              roleId: authUserRole.roleId,
              aboutUserRoleId: usersRoleEntity.id,
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
              aboutUserRoleId: usersRoleEntity.id,
            },
            required: false,
          },
        );
      }

      // Find only users with provided role
      const roles = await Role.findAll({
        where: {
          label: {
            [Op.in]: [].concat(usersRole),
          },
        },
      });
      options.include.push({
        model: UserRoles,
        as: 'roles',
        required: true,
        where: {
          roleId: roles.map(el => el.id),
        },
        include: [
          {
            model: Role,
            as: 'role',
          },
        ],
      });

      if (ids) {
        options.where[Op.and].push({
          id: {
            [Op.in]: ids,
          },
        });
      }

      if (!!autoType && !!autoBrands?.length) {
        // Find sellers that have all of selected auto brands
        options.where[Op.and].push({
          sellerAutoBrandsJson: {
            [Op.and]: autoBrands.map(autoBrandId => ({
              [Op.substring]: JSON.stringify({ autoTypeId: autoType, autoBrandId }),
            })),
          },
        });
      }
      if (!!productGroups?.length) {
        // Find sellers that have all of selected product groups
        options.where[Op.and].push({
          sellerProductGroupsJson: {
            [Op.and]: productGroups.map(groupId => ({
              [Op.substring]: groupId,
            })),
          },
        });
      }

      if (include) {
        if (include.indexOf('address') !== -1) {
          options.include.push({
            model: Address,
            as: 'address',
            required: false,
          });
        }
        if (include.indexOf('ordersWithAuthUser') !== -1) {
          options.include.push({
            model: Order,
            as: 'orders',
            required: false,
            include: [
              {
                model: OrderRequest,
                as: 'orderRequest',
                required: true,
                where: {
                  customerId: authUser.id,
                  paymentDate: {
                    [Op.ne]: null,
                  },
                },
              },
            ],
          });
        }
        if (include.includes('organizations')) {
          options.include.push({
            model: OrganizationSeller,
            as: 'sellers',
            separate: true,
            where: {
              confirmationDate: { [Op.ne]: null },
            },
            include: [
              {
                model: Organization,
                as: 'organization',
                required: true,
              },
            ],
          });
        }
        // if (include.includes('productCategories')) {
        //   options.include.push({
        //     model: SellerAutoBrands,
        //     as: 'sellerAutoBrands',
        //     separate: true,
        //     required: false,
        //   });
        //   options.include.push({
        //     model: ProductGroup,
        //     as: 'sellerProductGroups',
        //     separate: true,
        //     required: false,
        //   });
        // }
      }

      const users = await User.findAndCountAll(options);

      // Transform users
      for (let i = 0; i < users.rows.length; i++) {
        const user = users.rows[i];
        users.rows[i] = {
          ...simplifyUser(user.toJSON() as User),
          isOnline: !!(await usersOnlineStatus.getUserById(user.id)),
        } as any;
        if (!!user?.sellers?.length) {
          (users.rows[i] as any).organizations = user.sellers.map(
            ({ organization }) =>
              ({
                ...organization.toJSON(),
                name: getOrgName(organization, true, true),
              } as Organization),
          );
        }
      }

      return APIResponse({
        res,
        data: users,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список пользователей не загружен',
        error: err,
      });
    }
  };

  getSellerListForOrder = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;

      const users = await User.findAndCountAll({
        distinct: true,
        subQuery: false,
        order: [
          ['lastname', 'ASC'],
          ['firstname', 'ASC'],
        ],
        include: [
          {
            model: Order,
            as: 'orders',
            required: true,
            include: [
              {
                model: OrderRequest,
                as: 'orderRequest',
                required: true,
                where: {
                  customerId: authUser.id,
                  paymentDate: {
                    [Op.ne]: null,
                  },
                },
              },
            ],
          },
        ],
      });
      users.rows = users.rows.map(
        user =>
          ({
            ...simplifyUser(user.toJSON() as User),
          } as any),
      );

      return APIResponse({
        res,
        data: users,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список продавцов не загружен',
      });
    }
  };

  /**
   * @desc      Get one user
   * @route     GET /user
   * @query 		{ id?: string, phone?: string, include?: string[], organizationId?: string }
   * @success 	User
   * @access    Private: manager
   */
  getUser = createAPIMethod({ errorMessage: 'Пользователь не загружен', runTransaction: false }, async ({ req }) => {
    const { id, phone, include, organizationId } = req.query as any;
    const user = await usersService.getUser({ id, phone, include, organizationId });
    return { user };
  });

  /**
   * @desc      Update user
   * @route     PUT /user
   * @body 		  { user: User }
   * @success 	{ user: User }
   * @access    Private: any role
   */
  updateUser = createAPIMethod(
    { errorMessage: 'Ошибка при обновлении данных пользователя', runTransaction: true },
    async ({ req, transaction }) => {
      const userData: User = req.body.user;
      const user = await usersService.updateUser({ userData, transaction });
      return { user };
    },
  );

  /**
   * @desc      Create worker user
   * @route     POST /user/worker
   * @body      { user: IUserSimplified }
   * @success 	{ user: User, message: string }
   * @access    Private: superadmin
   */
  createWorker = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const userData: IUserSimplified = req.body.user;

        const phone = formatPhoneNumber(userData.phone);

        let user = await User.findOne({
          where: {
            phone,
          },
          include: [
            { model: Address, as: 'address' },
            {
              model: UserRoles,
              as: 'roles',
              required: false,
              include: [
                {
                  model: Role,
                  as: 'role',
                  required: false,
                },
              ],
            },
          ],
          transaction: t,
        });
        if (user) {
          let updatedAddress = user.address;

          if (!user?.address) {
            // Create user address
            updatedAddress = await Address.create(
              transformAddress({
                country: 'Россия',
                city: userData.address.city,
              }),
              {
                transaction: t,
              },
            );
          } else {
            if (!user.address?.city && !user.address?.settlement) {
              // Update user address
              updatedAddress = await user.address.update(
                transformAddress({
                  ...userData.address,
                }),
                {
                  transaction: t,
                },
              );
              updatedAddress = updatedAddress.toJSON() as Address;
            }
          }

          // Get role entities
          const roleEntities = await Role.findAll({
            where: {
              label: userData.roles.map((el: IUserRoleSimplified) => el.label),
            },
            transaction: t,
          });

          // Handle user roles
          for (const role of userData.roles) {
            const userRoleEntity = (user?.roles || []).find(el => el.role.label === role.label);
            // If provided user role was not created earlier at all
            if (!userRoleEntity) {
              await UserRoles.create(
                {
                  userId: user.id,
                  roleId: roleEntities.find(el => el.label === role.label).id,
                },
                {
                  transaction: t,
                },
              );
            }
          }
          for (const userRoleEntity of user.roles) {
            if (!(EMPLOYEE_ROLES as string[]).includes(userRoleEntity.role.label)) continue;
            const userRoleLabelIndex = userData.roles.findIndex(
              (role: IUserRoleSimplified) => userRoleEntity.role.label === role.label,
            );
            // If currently active user role is not provided in request body
            if (
              userRoleLabelIndex === -1 &&
              EMPLOYEE_ROLES.indexOf(userRoleEntity.role.label as IUserRoleOption) !== -1
            ) {
              // Delete user role
              await userRoleEntity.destroy({
                force: true,
                transaction: t,
              });
            }
          }

          // Update user
          user = await user.update(
            {
              phone: formatPhoneNumber(userData.phone),
              email: user.email || userData.email,
              firstname: user.firstname || userData.firstname,
              lastname: user.lastname || userData.lastname,
              middlename: user.middlename || userData.middlename,
              addressId: updatedAddress.id,
            },
            {
              transaction: t,
            },
          );

          // Transform user
          user = user.toJSON() as User;
          user.address = updatedAddress;
          user.roles = userData.roles as any;

          return APIResponse({
            res,
            data: {
              user,
              message: 'Сотрудник добавлен',
            },
          });
        }

        // Create user address
        const createdAddress = await Address.create(
          transformAddress({
            country: 'Россия',
            city: userData.address.city,
          }),
          {
            transaction: t,
          },
        );

        // Create user
        let createdUser = await User.create(
          {
            phone,
            email: userData.email,
            firstname: userData.firstname,
            lastname: userData.lastname,
            middlename: userData.middlename,
            addressId: createdAddress.id,
          },
          {
            transaction: t,
          },
        );
        createdUser = createdUser.toJSON() as User;

        // Transform user
        createdUser.roles = userData.roles as any;
        createdUser.address = createdAddress.toJSON() as Address;

        // Get role entities
        const roleEntities = await Role.findAll({
          where: {
            label: userData.roles.map((el: IUserRoleSimplified) => el.label),
          },
          transaction: t,
        });

        // Create UserRoles for each provided role
        for (const role of userData.roles) {
          let createdUserRole = await UserRoles.create(
            {
              userId: createdUser.id,
              roleId: roleEntities.find(el => el.label === role.label).id,
            },
            {
              transaction: t,
            },
          );
          createdUserRole = createdUserRole.toJSON() as UserRoles;
        }

        return APIResponse({
          res,
          data: {
            user: createdUser,
            message: 'Сотрудник добавлен',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при добавлении сотрудника',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Update worker user
   * @route     PUT /user/worker
   * @body      { user: IUserSimplified }
   * @success 	{ user: User, message: string }
   * @access    Private: superadmin
   */
  updateWorker = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const userData: IUserSimplified = req.body.user;

        // Get user
        let user = await User.findByPk(userData.id, {
          attributes: ['id', 'addressId'],
          include: [
            { model: Address, as: 'address' },
            {
              model: UserRoles,
              as: 'roles',
              required: false,
              include: [
                {
                  model: Role,
                  as: 'role',
                  where: {
                    label: EMPLOYEE_ROLES,
                  },
                  required: false,
                },
              ],
            },
          ],
          transaction: t,
        });

        // Update user address
        let updatedAddress = await user.address.update(
          transformAddress({
            ...userData.address,
          }),
          {
            transaction: t,
          },
        );
        updatedAddress = updatedAddress.toJSON() as Address;

        // Get role entities
        const roleEntities = await Role.findAll({
          where: {
            label: userData.roles.map((el: IUserRoleSimplified) => el.label),
          },
          transaction: t,
        });

        user.roles = user.roles.filter(userRole => !!userRole?.role);

        // Handle user roles
        for (const role of userData.roles) {
          const userRoleEntity = user.roles.find(el => el.role.label === role.label);
          // If provided user role was not created earlier at all
          if (!userRoleEntity) {
            await UserRoles.create(
              {
                userId: user.id,
                roleId: roleEntities.find(el => el.label === role.label).id,
              },
              {
                transaction: t,
              },
            );
          }
        }
        for (const userRoleEntity of user.roles) {
          if (!(EMPLOYEE_ROLES as string[]).includes(userRoleEntity.role.label)) continue;
          const userRoleLabelIndex = userData.roles.findIndex(
            (role: IUserRoleSimplified) => userRoleEntity.role.label === role.label,
          );
          // If currently active user role is not provided in request body
          if (
            userRoleLabelIndex === -1 &&
            EMPLOYEE_ROLES.indexOf(userRoleEntity.role.label as IUserRoleOption) !== -1
          ) {
            // Delete user role
            await userRoleEntity.destroy({
              force: true,
              transaction: t,
            });
          }
        }

        // Update user
        user = await user.update(
          {
            phone: formatPhoneNumber(userData.phone),
            email: userData.email,
            firstname: userData.firstname,
            lastname: userData.lastname,
            middlename: userData.middlename,
          },
          {
            transaction: t,
          },
        );

        // Transform user
        user = user.toJSON() as User;
        user.address = updatedAddress;
        user.roles = userData.roles as any;

        return APIResponse({
          res,
          data: {
            user,
            message: 'Данные сотрудника обновлены',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при обновлении данных сотрудника',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get authenticated user profile
   * @route     GET /user/profile
   * @success 	{ user: User, currentRole: IUserRoleOption }
   * @access    Private
   */
  getAuthUserProfile = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;

      // Get user
      let user = authUser.toJSON() as User;
      user = simplifyUser(user) as any;
      if (user.savedSellerIds) (user as any).savedSellerIds = user.savedSellerIds.split(' ');

      let hideSellerRewards = false;
      let sellerRegisterSimplified = false;
      let pendingPostponedPaymentsNumber = 0;

      if (authUserRole.role.label === 'customer') {
        const pricedCartProducts = user?.cartProducts?.filter(el => !!el?.priceOfferId);

        if (!!pricedCartProducts?.length) {
          const priceOffers = await StockBalance.findAll({
            where: {
              id: { [Op.in]: pricedCartProducts.map(el => el.priceOfferId) },
            },
          });
          user.cartProducts = user.cartProducts.filter(el =>
            priceOffers.some(priceOffer => priceOffer.id === el.priceOfferId),
          );
        }

        const customerOrganizationsItems = await JuristicSubjectCustomer.findAll({
          where: { userId: user.id },
        });
        pendingPostponedPaymentsNumber = await PostponedPayment.count({
          where: {
            customerOrganizationId: { [Op.in]: customerOrganizationsItems.map(el => el.juristicSubjectId) },
            status: 'PENDING',
          },
        });
      }

      if (authUserRole.role.label === 'seller') {
        // Due to special clients
        if (authUser?.sellers.some(seller => seller?.organization?.inn === SERVICE_ORGANIZATION_INN)) {
          user.isServiceSeller = true;
        } else {
          const serviceOrganization = await Organization.findOne({ where: { inn: SERVICE_ORGANIZATION_INN } });
          if (!!serviceOrganization) {
            const serviceSellerEntity = await OrganizationSeller.findOne({
              where: {
                organizationId: serviceOrganization.id,
                userId: authUser.id,
                confirmationDate: { [Op.ne]: null },
                detachedAt: null,
              },
            });
            if (!!serviceSellerEntity) user.isServiceSeller = true;
          }
        }

        // Due to separated organization commission
        const orgSellers = await OrganizationSeller.findAll({
          where: { userId: user.id },
        });

        const changedCommissionOrg = await Organization.findOne({
          where: {
            id: orgSellers.map(el => el.organizationId).concat(authUser.sellerRegisterOrganizationId),
            priceBenefitPercentAcquiring: { [Op.ne]: null },
            priceBenefitPercentInvoice: { [Op.ne]: null },
          },
          attributes: ['id', 'priceBenefitPercentAcquiring', 'priceBenefitPercentInvoice'],
        });
        sellerRegisterSimplified = !!changedCommissionOrg;

        const activeOrgSellers = orgSellers.filter(el => !!el?.confirmationDate && !el?.detachedAt);
        if (!!activeOrgSellers?.length) {
          const commonCommissionOrg = await Organization.findOne({
            where: {
              id: activeOrgSellers.map(el => el.organizationId),
              priceBenefitPercentAcquiring: null,
              priceBenefitPercentInvoice: null,
            },
            attributes: ['id', 'priceBenefitPercentAcquiring', 'priceBenefitPercentInvoice'],
          });
          hideSellerRewards = !commonCommissionOrg;
        }

        pendingPostponedPaymentsNumber = await PostponedPayment.count({
          where: {
            organizationId: { [Op.in]: user.sellers.map(el => el.organizationId) },
            status: 'PENDING',
          },
        });
      }

      return APIResponse({
        res,
        data: {
          user,
          currentRole: { id: authUserRole.role.id, label: authUserRole.role.label },
          hideSellerRewards,
          sellerRegisterSimplified,
          pendingPostponedPaymentsNumber,
        },
      });
    } catch (e) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Профиль НЕ получен',
        error: e,
      });
    }
  };

  getPersonalAreaData = createAPIMethod(
    { errorMessage: 'Не удалось получить данные личного кабинета', runTransaction: false },
    async ({ authUser, authUserRole }) => {
      let pendingPostponedPaymentsNumber = 0;

      if (authUserRole.role.label === 'customer') {
        const customerOrganizationsItems = await JuristicSubjectCustomer.findAll({
          where: { userId: authUser.id },
        });
        pendingPostponedPaymentsNumber = await PostponedPayment.count({
          where: {
            customerOrganizationId: { [Op.in]: customerOrganizationsItems.map(el => el.juristicSubjectId) },
            status: 'PENDING',
          },
        });
      }

      if (authUserRole.role.label === 'seller') {
        pendingPostponedPaymentsNumber = await PostponedPayment.count({
          where: {
            organizationId: { [Op.in]: authUser.sellers.map(el => el.organizationId) },
            status: 'PENDING',
          },
        });
      }

      return {
        pendingPostponedPaymentsNumber,
      };
    },
  );

  /**
   * @desc      Change auth user's name
   * @route     PATCH /user/profile/username
   * @body 			{ lastname: string, firstname: string; middlename?: string }
   * @success 	{ user: User }
   * @access    Private. Any authorized user
   */
  updateAuthUserName = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const lastname = req.body?.user?.lastname;
        const firstname = req.body?.user?.firstname;
        const middlename = req.body?.user?.middlename;

        if (!lastname || !firstname) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Фамилия и имя обязательны для заполнения',
          });
        }

        const user = await authUser.update(
          {
            lastname,
            firstname,
            middlename,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            user,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить ФИО',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Change auth user's phone number.
   * @route     PATCH /user/profile/phone
   * @body 			{ phone: string, confirmCode?: srting }
   * @success 	{ success: boolean } || { user: User }
   * @access    Private. Any authorized user
   */
  updateAuthUserPhone = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const confirmCode = req.body?.confirmCode;
        const phone = formatPhoneNumber(req.body?.phone);

        if (!phone) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Некорректный номер телефона',
          });
        }

        if (!confirmCode) {
          const success = await sendAuthCode({ phone, userId: authUser.id, authMethod: 'call', transaction });

          if (!success) {
            throw APIError({
              res,
              status: httpStatus.INTERNAL_SERVER_ERROR,
              message: 'Код не был отправлен',
            });
          }

          return APIResponse({
            res,
            data: {
              success,
            },
          });
        }

        // Code verifying
        if (!(await verifySMSCode({ code: confirmCode, userId: authUser.id, transaction }))) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Неверный код подтверждения',
          });
        }

        // Verification successful
        const user = await authUser.update(
          {
            phone,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            user,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить номер телефона',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Change auth user's phone number.
   * @route     PATCH /user/profile/phone-visible
   * @success 	{ user: User }
   * @access    Private. Any authorized user
   */
  toggleAuthUserPhoneVisible = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;

        const user = await authUser.update(
          {
            phoneIsHidden: !authUser.phoneIsHidden,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            user,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить видимость телефона',
          error: err,
        });
      }
    });
  };

  toggleEmailNotification = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;

        const user = await authUser.update(
          {
            isAgreeEmailNotification: !authUser.isAgreeEmailNotification,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            user,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить toggleEmailNotification',
          error: err,
        });
      }
    });
  };

  updateEmailForNotification = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const emailNotification = req.body.emailNotification;

        const user = await authUser.update(
          {
            emailNotification: emailNotification,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            user,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить emailNotification',
          error: err,
        });
      }
    });
  };

  updateDefaultAddress = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const defaultAddressId = req.body.defaultAddressId;
        const deliveryAddresses = req.body.deliveryAddresses as Address;
        console.log('defaultAddressId', defaultAddressId);

        // Если пользователь не добовлял до этого адрес по умолчанию то создаем запись в базе
        if (defaultAddressId === '') {
          const addressId = await Address.create(transformAddress({ ...deliveryAddresses }), { transaction });

          const deliveryAddress = await DeliveryAddress.create(
            {
              userId: authUser.id,
              addressId: addressId.id,
              isDefault: true,
            },
            { transaction },
          );

          const user = await User.findOne({ where: { id: deliveryAddress.userId }, transaction });
          const address = await Address.findOne({ where: { id: deliveryAddress.addressId }, transaction });

          return APIResponse({
            res,
            data: { user, address, deliveryAddress },
          });
        }
        // Если пользователь добовлял до этого адрес по умолчанию то обновляем запись в базе
        if (!!deliveryAddresses.region && !!deliveryAddresses.city) {
          await Address.update(transformAddress({ ...deliveryAddresses }), {
            where: { id: defaultAddressId },
            transaction,
          });
          const [count, deliveryAddress] = await DeliveryAddress.update(
            {
              isDefault: true,
            },
            {
              where: { userId: authUser.id, addressId: defaultAddressId },
              transaction,
            },
          );
          const user = await User.findOne({ where: { id: authUser.id }, transaction });
          const address = await Address.findOne({ where: { id: defaultAddressId }, transaction });
          return APIResponse({
            res,
            data: { user, address, deliveryAddress },
          });
        }
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось обновить адрес по умолчанию',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Change user's phone number.
   * @route     POST /user/change-phone
   * @body 			{ phone: string, confirmCode?: srting }
   * @success 	{ success: boolean } || { payload: LoginResponse, user: User }
   * @access    Private
   */
  changePhone = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { phone } = req.body;
        const confirmCode = req.body?.confirmCode;
        const authUser: User = req.body.authUser;

        // update user info
        await authUser.update({ phone, phoneVerificationDate: null }, { where: { id: authUser.id } });

        if (!confirmCode) {
          const success = await sendAuthCode({ phone, userId: authUser.id, authMethod: 'call', transaction });

          if (!success) {
            throw APIError({
              res,
              status: httpStatus.INTERNAL_SERVER_ERROR,
              message: 'Код не был отправлен',
            });
          }

          return APIResponse({
            res,
            data: {
              success,
            },
          });
        }

        // Проверка кода
        if (!(await verifySMSCode({ code: confirmCode, userId: authUser.id, transaction }))) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Неверный код подтверждения',
          });
        }

        // verification successful
        await authUser.update({
          phoneVerificationDate: new Date(),
        });

        // Send payload
        return APIResponse({
          res,
          data: {
            payload: generatePayload(authUser),
            authUser,
          },
        });
      } catch (err) {
        console.error(err);
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Номер телефона не обновлён',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Send verification mail with url in body. ex: http://localhost:7777/confirm/${confirmCode}
   * @route     POST /user/send-email
   * @body 			{ email: string }
   * @success 	{ success: boolean }
   * @access    Private
   */
  sendVerificationEmail = async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      const authUser: User = req.body.authUser;

      // update user info
      await authUser.update({ email, emailVerified: false }, { where: { id: authUser.id } });

      await sendEmail(email, authUser.id);

      return APIResponse({
        res,
        data: {
          success: true,
        },
      });
    } catch (err) {
      console.error(err);
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Email нет отправлен',
        error: err,
      });
    }
  };

  /**
   * @desc      Verify code from confirmation email
   * @route     POST /user/email-verification
   * @body 			{ confirmCode: string }
   * @success 	{ success: boolean }
   * @access    Private
   */
  emailVerification = async (req: Request, res: Response) => {
    try {
      const { confirmCode } = req.body;
      const authUser: User = req.body.authUser;

      const isVerifiedEmail = verifyEmailCode(confirmCode, authUser.id);

      // Подтверждение.
      await authUser.update({
        emailVerified: isVerifiedEmail,
      });

      return APIResponse({
        res,
        data: { success: isVerifiedEmail },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Почта не верефицирована',
        error: err,
      });
    }
  };

  /**
   * @desc      Delete user
   * @route     DELETE /user
   * @body      { userId: string }
   * @success 	{ userId: string, message: string }
   * @access    Admin
   */
  deleteProfile = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        await deleteUserService({
          userId: authUser.id,
          authUser,
          authUserRole,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            message: 'Ваш профиль удален',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Пользователь не удален',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete user
   * @route     DELETE /user
   * @body      { userId: string }
   * @success 	{ userId: string, message: string }
   * @access    Admin
   */
  initiateUserDeletion = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        await initiateUserDeleteService({
          userId: authUser.id,
          authUser,
          authUserRole,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            message: 'Ваш профиль будет удален через 30 дней',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Пользователь не удален',
          error: err,
        });
      }
    });
  };

  cancelUserDeletion = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;

        await cancelUserDeletionService({
          userId: authUser.id,
          authUser,
          authUserRole,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            message: 'Удаления профиля отменено',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Пользователь не удален',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete list of users
   * @route     DELETE /user/list
   * @body      { users: {id: string, roles: IUserRoleOption[]}[] }
   * @success 	{ success: boolean }
   * @access    Private: superamdin
   */
  deleteUserList = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const users: {
          id: string;
          roles: IUserRoleOption[];
        }[] = req.body.users;

        const roles = await Role.findAll({
          transaction: t,
        });

        for (const user of users) {
          if (user.roles.length >= 4) {
            await User.destroy({
              where: {
                id: user.id,
              },
              transaction: t,
            });
          } else {
            for (const roleLabel of user.roles) {
              const roleEntity = roles.find(el => el.label === roleLabel);
              await UserRoles.destroy({
                where: {
                  userId: user.id,
                  roleId: roleEntity.id,
                },
                transaction: t,
              });
            }
          }
        }

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
          message: 'Ошибка при удалении пользователей',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Ban user role or user
   * @route     POST /user/ban
   * @body      { userId: string, roleLabel: string, isBanned: boolean }
   * @success 	{ success: boolean }
   * @access    Private: superamdin
   */
  banUser = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const userId: string = req.body.userId;
        const roleLabel: string = req.body.roleLabel;
        const isBanned: boolean = req.body.isBanned;
        const bannedUntil = new Date();

        const roles = await Role.findAll({
          transaction: t,
        });

        if (roleLabel === 'all') {
          await User.update(
            {
              bannedUntil: isBanned ? bannedUntil : null,
            },
            {
              where: {
                id: userId,
              },
              transaction: t,
            },
          );
        } else {
          const roleEntity = roles.find(el => el.label === roleLabel);
          await UserRoles.update(
            {
              bannedUntil: isBanned ? bannedUntil : null,
            },
            {
              where: {
                userId,
                roleId: roleEntity.id,
              },
              transaction: t,
            },
          );
        }

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
          message: 'Ошибка при блокировке пользователей',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Create juristic subject
   * @route     POST /user/juristic-subject
   * @body 			{ juristicSubject: JuristicSubject }
   * @success 	{ data: JuristicSubject }
   * @access    Private: customer
   */
  createJuristicSubject = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const userId = authUser.id;
        const juristicSubjectData: JuristicSubject = req.body.juristicSubject;

        let juristicSubject = await JuristicSubject.findOne({
          where: {
            inn: juristicSubjectData.inn,
          },
          transaction,
        });

        if (!juristicSubject) {
          // Juristic address
          const juristicAddress = await Address.create(transformAddress(juristicSubjectData.juristicAddress), {
            transaction,
          });
          juristicSubjectData.juristicAddressId = juristicAddress.id;

          // Mailing address
          const mailingAddress = await Address.create(transformAddress(juristicSubjectData.mailingAddress), {
            transaction,
          });
          juristicSubjectData.mailingAddressId = mailingAddress.id;

          let juristicNds: string = '';
          if (juristicSubjectData.hasNds === true) {
            juristicNds = 'НДС 20%';
          } else {
            juristicNds = 'Без НДС';
          }

          const pathToCustomerTemplate = 'templates/customerOrganizationInfo.html';

          // Define entityCode if not provided
          if (typeof juristicSubjectData.entityCode === 'undefined') {
            if (!!juristicSubjectData.entityType) {
              let entityCode: string = ORG_ENTITY_TYPES.find(
                el => el?.name?.short === juristicSubjectData.entityType,
              )?.code;
              juristicSubjectData.entityCode = entityCode;
            }
          }

          const dataJuristic: IOrganizationInfo = {
            inn: juristicSubjectData.inn,
            orgnLabel: juristicSubjectData.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
            ogrn: juristicSubjectData.ogrn,
            kpp: juristicSubjectData.kpp,
            orgNameLabel: juristicSubjectData.entityType === 'ИП' ? 'Наименование ИП' : 'Наименование юр. лица',
            orgName: juristicSubjectData.name,
            email: juristicSubjectData.email,
            organizationNds: juristicNds,
            juristicAddressCountry: juristicAddress.country,
            juristicAddressRegion: juristicAddress.region,
            juristicAddressSettlement: juristicAddress.settlement,
            juristicAddressStreet: juristicAddress.street,
            juristicAddressBuilding: juristicAddress.building,
            juristicAddressApartment: juristicAddress.apartment,
            mailingAddressCountry: mailingAddress.country,
            mailingAddressRegion: mailingAddress.region,
            mailingAddressSettlement: mailingAddress.settlement,
            mailingAddressStreet: mailingAddress.street,
            mailingAddressBuilding: mailingAddress.building,
            mailingAddressApartment: mailingAddress.apartment,
            bankName: juristicSubjectData.bankName,
            bankInn: juristicSubjectData.bankInn,
            bankBik: juristicSubjectData.bankBik,
            bankKs: juristicSubjectData.bankKs,
            bankRs: juristicSubjectData.bankRs,
          };

          // Create juristicSubject
          juristicSubject = await JuristicSubject.create(
            {
              ...juristicSubjectData,
              name: getOrgName(juristicSubjectData, true, false),
              nameWithoutType: getOrgName(juristicSubjectData, false, false),
              creatorUserId: userId,
              path: null,
            },
            { transaction },
          );

          uploadPdf({
            data: dataJuristic,
            pathToTemplate: pathToCustomerTemplate,
            pathToPdfFolder: `juristicData/${juristicSubjectData.inn}`,
            pdfName: `${juristicSubjectData.inn}.pdf`,
            transaction,
          }).then(async ({ file }) => {
            await JuristicSubject.update(
              { path: file.path },
              {
                where: { id: juristicSubject.id },
              },
            );
          });
        }

        const customer = await JuristicSubjectCustomer.findOne({
          where: {
            juristicSubjectId: juristicSubject.id,
            userId,
          },
          transaction,
        });
        if (!!customer)
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Организация уже добавлена',
          });

        await JuristicSubjectCustomer.create(
          {
            juristicSubjectId: juristicSubject.id,
            userId,
          },
          { transaction },
        );

        return APIResponse({
          res,
          data: juristicSubject,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Юридическое лицо не добавлено',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get customer's juristic subject list
   * @route     GET /user/juristic-subject/list
   * @query     ? userId & ?pageSize & ?page
   * @success 	{ rows: JuristicSubject[]; count: number; }
   * @access    Private: manager, customer
   */
  getCustomerJuristicSubjectList = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const userId = query.userId as string;

      const options: seq.FindOptions = {};

      options.where = { userId };

      if (query?.page || query?.limit) {
        options.limit = Number(query.pageSize) || 12;
        options.offset = (Number(query.pageSize) || 12) * ((Number(query.page) || 1) - 1);
      }

      const jurSubjectCustomers = await JuristicSubjectCustomer.findAndCountAll(options);

      const jurSubjects = await JuristicSubject.findAll({
        where: {
          id: jurSubjectCustomers.rows.map(el => el.juristicSubjectId),
        },
        include: [
          { model: Address, as: 'juristicAddress', required: true },
          { model: Address, as: 'mailingAddress', required: true },
        ],
      });

      const resData = {
        count: jurSubjectCustomers.count,
        rows: jurSubjects,
      };

      return APIResponse({
        res,
        data: resData,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при загрузке юридических лиц пользователя',
        error: err,
      });
    }
  };

  updateJuristicSubjectSpecialStatus = createAPIMethod(
    { errorMessage: 'Ошибка при изменении статуса организации', runTransaction: true },
    async ({ req, transaction }) => {
      const id = req.query.id as string;
      const { isSpecialClient } = req.body;

      const juristicSubject = await updateJuristicSubjectSpecialStatusService({ id, isSpecialClient }, { transaction });

      return {
        isSpecialClient: juristicSubject.isSpecialClient,
      };
    },
  );

  getCustomerContractList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      if (!authUser.isSpecialClient)
        return APIResponse({
          res,
          data: [],
        });

      const userCustomers = await JuristicSubjectCustomer.findAll({
        where: {
          userId: authUser.id,
        },
      });
      const juristicSubjects = (
        await JuristicSubject.findAll({
          where: { id: userCustomers.map(el => el.juristicSubjectId), isSpecialClient: true },
        })
      ).map(el => el.toJSON() as JuristicSubject);
      const allContracts = (
        await CustomerContract.findAll({
          where: {
            juristicSubjectId: juristicSubjects.map(el => el.id),
            customerId: authUser.id,
          },
          include: [
            { model: FileModel, as: 'file', required: true },
            {
              model: CustomerContractSpecification,
              as: 'specifications',
              separate: true,
              include: [{ model: FileModel, as: 'file' }],
            },
          ],
        })
      ).map(el => el.toJSON() as CustomerContract);

      for (const jurSubject of juristicSubjects) {
        jurSubject.customerContracts = allContracts.filter(el => el.juristicSubjectId === jurSubject.id);
      }

      return APIResponse({
        res,
        data: juristicSubjects,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при получении списка договоров',
        error: err,
      });
    }
  };

  updateJuristicSubjectPostponedPaymentAllowed = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const id = req.query.id as string;
        const { postponedPaymentAllowed } = req.body;

        let juristicSubject = await JuristicSubject.findByPk(id, { transaction });
        if (!juristicSubject)
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Организация не найдена',
          });

        if (!postponedPaymentAllowed) {
          const activeOrderRequest = await OrderRequest.findOne({
            where: {
              payerId: juristicSubject.id,
              status: { [Op.notIn]: ['DECLINED', 'COMPLETED'] },
            },
            transaction,
          });
          if (!!activeOrderRequest)
            throw APIError({
              res,
              status: httpStatus.BAD_REQUEST,
              message: 'На организации есть активные заказы',
            });
        }

        // Update JuristicSubject
        juristicSubject = await juristicSubject.update({ postponedPaymentAllowed }, { transaction });

        const orgCustomers = await JuristicSubjectCustomer.findAll({
          where: {
            juristicSubjectId: juristicSubject.id,
          },
          transaction,
        });
        for (const orgCustomer of orgCustomers) {
          // Find all customer user organizations (JuristicSubject[])
          const otherUserOrgCustomers = await JuristicSubjectCustomer.findAll({
            where: {
              juristicSubjectId: { [Op.ne]: juristicSubject.id },
              userId: orgCustomer.userId,
            },
            transaction,
          });
          const otherUserOrgs = !!otherUserOrgCustomers?.length
            ? await JuristicSubject.findAll({
                where: {
                  id: otherUserOrgCustomers.map(el => el.juristicSubjectId),
                },
                transaction,
              })
            : [];
          const allUserOrgs = [juristicSubject, ...otherUserOrgs];
          // Update customer user postponedPaymentAllowed
          await User.update(
            {
              postponedPaymentAllowed: allUserOrgs.some(org => org.postponedPaymentAllowed),
            },
            {
              where: {
                id: orgCustomer.userId,
              },
              limit: 1,
              transaction,
            },
          );
        }

        return APIResponse({
          res,
          data: {
            postponedPaymentAllowed: juristicSubject.postponedPaymentAllowed,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при изменении статуса организации',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get customer's juristic subject by id
   * @route     GET /user/juristic-subject
   * @query     ? id
   * @success 	JuristicSubject
   * @access    Private: customer
   */
  getCustomerJuristicSubject = async (req: Request, res: Response) => {
    try {
      const { id } = req.query;

      let jurSubject = await JuristicSubject.findByPk(id as string, {
        include: [
          { model: Address, as: 'juristicAddress' },
          { model: Address, as: 'mailingAddress' },
        ],
      });

      jurSubject = jurSubject.toJSON() as JuristicSubject;
      jurSubject.name = getOrgName(jurSubject, true, true);

      return APIResponse({
        res,
        data: jurSubject,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при загрузке юридического лица пользователя',
        error: err,
      });
    }
  };

  /**
   * @desc      Update customer's juristic subject
   * @route     PUT /user/juristic-subject
   * @query     ? id
   * @body      { juristicSubject: JuristicSubject }
   * @success 	JuristicSubject
   * @access    Private: customer
   */
  updateCustomerJuristicSubject = createAPIMethod(
    { errorMessage: 'Ошибка при обновлении юридического лица пользователя', runTransaction: true },
    async ({ req, authUser, authUserRole, transaction }) => {
      const { id } = req.query as any;
      const juristicSubjectData: JuristicSubject = req.body.juristicSubject;

      const updatedJuristicSubject = await usersService.updateJuristicSubject(
        { id, juristicSubjectData, authUser, authUserRole },
        { transaction },
      );

      return updatedJuristicSubject;
    },
  );

  /**
   * @desc      Delete customer's juristic subject
   * @route     DELETE /user/juristic-subject
   * @query     ? id & agreed
   * @success 	{ id: Identifier, message: string }
   * @access    Private: customer
   */
  deleteCustomerJuristicSubject = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.query;
        const authUser: User = req.body.authUser;

        const jurSubject = await JuristicSubject.findByPk(id as Identifier, {
          transaction,
        });
        const jurSubjectCustomer = await JuristicSubjectCustomer.findOne({
          where: {
            juristicSubjectId: jurSubject.id,
            userId: authUser.id,
          },
          transaction,
        });

        if (!jurSubject || !jurSubjectCustomer)
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Организация не найдена',
          });

        const unfinishedOrderRequests = await OrderRequest.findAll({
          where: {
            payerId: jurSubject.id,
            status: {
              [Op.notIn]: ['DECLINED', 'COMPLETED'],
            },
          },
          transaction,
        });

        if (unfinishedOrderRequests.length > 0)
          throw APIError({
            res,
            status: httpStatus.NOT_ACCEPTABLE,
            message: `По организации «${jurSubject.name}» есть незавершенные заказы.`,
          });

        if (req.query?.agreed) {
          const orgCustomers = await JuristicSubjectCustomer.findAll({
            where: {
              juristicSubjectId: jurSubject.id,
            },
            transaction,
          });
          for (const orgCustomer of orgCustomers) {
            // Find all customer user organizations (JuristicSubject[])
            const otherUserOrgCustomers = await JuristicSubjectCustomer.findAll({
              where: {
                juristicSubjectId: { [Op.ne]: jurSubject.id },
                userId: orgCustomer.userId,
              },
              transaction,
            });
            const otherUserOrgs = !!otherUserOrgCustomers?.length
              ? await JuristicSubject.findAll({
                  where: {
                    id: otherUserOrgCustomers.map(el => el.juristicSubjectId),
                  },
                  transaction,
                })
              : [];
            // Update customer user special client status
            await User.update(
              {
                isSpecialClient: otherUserOrgs.some(org => org.isSpecialClient),
              },
              {
                where: {
                  id: orgCustomer.userId,
                },
                limit: 1,
                transaction,
              },
            );
          }

          await jurSubjectCustomer.destroy({
            transaction,
          });

          return APIResponse({
            res,
            data: {
              id,
              message: 'Организация была успешно удалена',
            },
          });
        }

        return APIResponse({
          res,
          data: {
            id,
            message: `Удалить организацию<br>«${jurSubject.name}»?`,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при загрузке юридического лица пользователя',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get customer user
   * @route     GET /user/customer
   * @query     { id: string }
   * @success 	{ user: User }
   * @access    Private: manager, customer
   */
  getCustomerUser = async (req: Request, res: Response) => {
    try {
      const { id } = req.query;
      const user = await User.findByPk(id as string);

      return APIResponse({
        res,
        data: {
          user,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при загрузке пользователя',
        error: err,
      });
    }
  };

  /**
   * @desc      Get user info
   * @route     GET /user/info
   * @query     { id: string, include?: IGetUserIncludes }
   * @success 	{ user: User }
   * @access    Private: inspectUsersInfoAvailable
   */
  getUserInfo = async (req: Request, res: Response) => {
    try {
      const id = req.query?.id;
      const include = req.query?.include as IGetUserIncludes;
      const userRole = req?.query.role as IUserRoleOption;
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const resultData: any = {};
      const options: seq.FindOptions = {};
      options.where = { id };
      options.include = [];

      options.include.push({
        model: UserRoles,
        as: 'roles',
        include: [{ model: Role, as: 'role' }],
      });

      options.include.push(
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
      );

      options.include.push({
        model: DeliveryAddress,
        as: 'deliveryAddresses',
        include: [
          {
            model: Address,
            as: 'address',
            required: false,
          },
        ],
        required: false,
        separate: true,
        attributes: ['userId', 'addressId'],
        order: [['createdAt', 'DESC']], // Сортировка по убыванию даты создания
        limit: 1, // Ограничение на количество записей
      });

      if (include) {
        if (include.includes('address')) {
          options.include.push({
            model: Address,
            as: 'address',
            required: false,
          });
        }

        if (include.includes('organizations')) {
          options.include.push({
            model: OrganizationSeller,
            as: 'sellers',
            required: false,
            separate: true,
            include: [
              {
                model: Organization,
                as: 'organization',
                required: false,
                include: [
                  {
                    model: Address,
                    required: true,
                    as: 'actualAddress',
                  },
                ],
              },
            ],
          });
        }

        if (include.includes('transportCompanies')) {
          options.include.push({
            model: TransportCompany,
            as: 'transportCompanies',
            required: false,
          });
        }

        if (include.includes('orderRequests')) {
          options.include.push({
            model: OrderRequest,
            as: 'orderRequests',
            required: false,
            separate: true,
          });
        }

        if (include.includes('requisites')) {
          options.include.push({
            model: Requisites,
            as: 'requisites',
            required: false,
          });

          options.include.push({
            model: SellerRegisterFile,
            as: 'sellerRegisterFiles',
            required: false,
            separate: true,
            include: [{ model: FileModel, as: 'file' }],
          });
        }

        if (include.includes('sellerRefundsNumber')) {
          const refundRequests = await RefundExchangeRequest.findAll({
            where: {
              status: 'CLOSED',
              isRejected: false,
            },
            include: [
              {
                model: Order,
                as: 'order',
                required: true,
                where: {
                  sellerId: id,
                },
              },
            ],
          });
          resultData.sellerRefundsNumber = refundRequests.length;
        }

        if (include.includes('counters')) {
          resultData.counters = {
            orderRequestsCount: await OrderRequest.count({ where: { customerId: id } }),
            ordersCount: await OrderRequest.count({
              where: { customerId: id, [Op.or]: [{ status: 'PAID' }, { status: 'COMPLETED' }] },
            }),
            refundsCount: await RefundExchangeRequest.count({
              where: { customerId: id, status: 'CLOSED', isRejected: false },
            }),
            receivedComplaintsCount: await Complaint.count({ where: { defendantId: id } }),
            sentComplaintsCount: await Complaint.count({ where: { appellantId: id } }),
          };
        }
      }

      const user = simplifyUser(await User.findOne(options));

      if (!user) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Пользователь не найден',
        });
      }

      if (userRole === 'customer' && authUserRole.role.label === 'seller' && user.phoneIsHidden) {
        user.phone = 'hidden';
      }

      if (user?.transportCompanies && user?.transportCompanies?.length === 0) {
        user.transportCompanies = (await TransportCompany.findAll()).map(el => el.toJSON() as TransportCompany);
      }

      resultData.user = user;

      return APIResponse({
        res,
        data: {
          ...resultData,
          transportCompanies: user.transportCompanies,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при загрузке пользователя',
        error: err,
      });
    }
  };

  /**
   * @desc      Write a review for the seller
   * @route     POST /user/review
   * @query     { receiverId: string, orderId?: string }
   * @body      { rating: number, text?: string }
   * @success 	{ data: UserReview }
   * @access    Private: writeReviewAvailable
   */
  addUserReview = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const receiverId = req.query?.receiverId as string;
        const orderId = req.query?.orderId as string;
        const { rating, text } = req.body;
        const authUser: User = req.body.authUser;

        const { userReview } = await createUserReview({
          status: USER_REVIEW_STATUSES.DEFAULT,
          receiverId,
          orderId,
          productOfferId: null,
          rating,
          text,
          authUser,
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: userReview,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при создании отзыва',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Get user reviews
   * @route     GET /user/review
   * @params    ? receiverId & orderId & page
   * @success 	{ data: { rows: UserReview[], count: number } }
   * @access    Public
   */
  getUserReviews = async (req: Request, res: Response) => {
    try {
      const receiverId = req.query?.receiverId;
      const orderId = req.query?.orderId;

      let options: seq.FindOptions = {
        order: [['createdAt', 'DESC']],
      };

      options.where = {
        status: USER_REVIEW_STATUSES.DEFAULT,
      };
      if (!!orderId) {
        options.where.orderId = orderId;
      } else {
        options.where.receiverId = receiverId;
      }

      if (req.query?.page) {
        options = {
          ...options,
          ...getPaginationParams(req.query, 10),
        };
      }

      options.include = [
        {
          model: User,
          as: 'author',
        },
      ];

      console.log(options);

      const reviewList = await UserReview.findAndCountAll(options);

      console.log(reviewList);

      return APIResponse({
        res,
        data: reviewList,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при получении отзывов',
        error: err,
      });
    }
  };

  handleSellerRegister = createAPIMethod(
    { errorMessage: 'Заявка на регистрацию не обработана', runTransaction: true },
    async ({ req, res, transaction }) => {
      const userData: User = req.body.user;

      let resultData: any = null;
      const userEntity = await User.findOne({
        where: {
          id: userData.id,
        },
        include: [
          {
            model: Requisites,
            as: 'requisites',
            required: false,
          },
        ],
        transaction,
      });
      const orgSeller = await OrganizationSeller.findOne({
        where: {
          userId: userEntity.id,
        },
        transaction,
      });
      const orgId = orgSeller?.organizationId || userEntity.sellerRegisterOrganizationId;
      const orgBranchId = orgSeller?.branchId || userEntity.sellerRegisterOrganizationBranchId;

      if (!userData?.sellerAutoBrands?.length && !userData?.sellerProductGroups?.length)
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Необходимо выбрать категории товаров',
        });

      if (!userEntity.requisites || !orgSeller) {
        const user = await usersService.updateUser({ userData, transaction });

        if (!orgSeller) {
          await OrganizationSeller.create(
            {
              organizationId: orgId,
              userId: user.id,
              branchId: orgBranchId,
            },
            { transaction },
          );
        }

        resultData = {
          user,
        };
      } else {
        const user = await usersService.updateUser({ userData, transaction });

        const orgSeller = await OrganizationSeller.findOne({
          where: {
            organizationId: orgId,
            userId: user.id,
          },
          transaction,
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
        if (!!rejection) await rejection.update({ isResponded: true }, { transaction });

        resultData = {
          user,
          message: 'Повторная заявка на регистрацию продавца отправлена',
        };
      }

      const org = await Organization.findByPk(orgId, {
        transaction,
      });

      await createNotificationForAllManagersService({
        type: !userEntity.requisites
          ? ENotificationType.registerSellerApplication
          : ENotificationType.registerSellerApplicationUpdated,
        autoread: false,
        organizationId: org.id,
        data: {
          seller: {
            userId: userEntity.id,
            name: getUserName(userEntity),
          },
          organization: {
            id: org.id,
            name: getOrgName(org, true, true),
          },
        },
        io: this.io,
        res,
        transaction,
      });

      return resultData;
    },
  );

  getSellerUpdateApplication = async (req: Request, res: Response) => {
    const { userId } = req.params;
    const status = req.query?.status as 'any';

    const { sellerUpdateApplication } = await getSellerUpdateApplicationService({
      userId,
      status,
      res,
    });

    return APIResponse({
      res,
      data: {
        sellerUpdateApplication,
      },
    });
  };

  createSellerUpdateApplication = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const { userId } = req.params;
      const userData: User = req.body.user;

      const { sellerUpdateApplication } = await createSellerUpdateApplicationService({
        userId,
        userData,
        io: this.io,
        res,
        transaction,
      });

      return APIResponse({
        res,
        data: {
          sellerUpdateApplication,
        },
      });
    });
  };

  confirmSellerUpdateApplication = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const { userId } = req.params;
      const userData: User = req.body.user;

      const { sellerUpdateApplication } = await confirmSellerUpdateApplicationService({
        userId,
        userData,
        io: this.io,
        res,
        transaction,
      });

      return APIResponse({
        res,
        data: {
          sellerUpdateApplication,
        },
      });
    });
  };

  rejectSellerUpdateApplication = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const { userId } = req.params;
      const rejectionMessage: string = req.body.rejectionMessage;

      const { sellerUpdateApplication } = await rejectSellerUpdateApplicationService({
        userId,
        rejectionMessage,
        io: this.io,
        res,
        transaction,
      });

      return APIResponse({
        res,
        data: {
          sellerUpdateApplication,
        },
      });
    });
  };

  updateSellerProductCategories = createAPIMethod(
    { errorMessage: 'Не удалось обновить категории', runTransaction: true },
    async ({ req, transaction, authUser, authUserRole }) => {
      const userId = ['manager', 'operator'].includes(authUserRole?.role.label) ? req.body?.userId : authUser.id;
      const { autoBrands, productGroupIds } = req.body;

      await updateSellerProductCategoriesService({ userId, autoBrands, productGroupIds, transaction });

      return null;
    },
  );

  updateSellerOfferDoc = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      const { name, date }: { name: string; date: Date } = req.body?.sellerOfferDoc;
      const userId: string = req.body?.userId;

      if ((!!name && !date) || (!name && !!date)) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Название и дата документы должны быть заполнены или пусты',
        });
      }

      await User.update(
        {
          sellerOfferDocName: name,
          sellerOfferDocDate: date,
        },
        {
          where: {
            id: userId,
          },
          transaction,
        },
      );

      return APIResponse({
        res,
        data: {
          message: 'Данные договора обновлены',
        },
      });
    });
  };

  saveDeviceToken = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const { platform, deviceId, token } = req.body;

        const deviceToken = await DeviceToken.findOne({
          where: {
            userId: authUser.id,
            platform,
            deviceId,
            active: true,
          },
          transaction,
        });
        if (!!deviceToken) {
          await deviceToken.update({ active: false }, { transaction });
        }

        await DeviceToken.create(
          {
            userId: authUser.id,
            platform,
            deviceId,
            token,
            active: true,
          },
          {
            transaction,
          },
        );

        return APIResponse({
          res,
          data: {
            message: 'Токен устройства успешно сохранен',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось сохранить токен устройства',
          error: err,
        });
      }
    });
  };

  deleteDeviceToken = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const { deviceId } = req.body;

        const deviceTokens = await DeviceToken.findAll({
          where: {
            userId: authUser.id,
            deviceId,
            active: true,
          },
          transaction,
        });
        if (!deviceTokens?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Токен не найден',
          });
        }

        await DeviceToken.destroy({
          where: {
            userId: authUser.id,
            deviceId,
            active: true,
          },
          transaction,
        });

        return APIResponse({
          res,
          data: {
            message: 'Токен устройства успешно удален',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось удалить токен устройства',
          error: err,
        });
      }
    });
  };

  getSellerProductCategories = async (req: Request, res: Response) => {
    try {
      const { id: sellerId } = req.params;
      const authUser: User = req.body.authUser;
      const isAdmin = verifyPermissions('manageAllSellerDataAvailable', { req }).result;
      const userId = isAdmin ? Number(sellerId) : authUser.id;

      const autoBrands = await SellerAutoBrands.findAll({
        where: { userId },
      });
      const groups = await SellerProductGroups.findAll({
        where: { userId },
      });
      const resData = {
        sellerAutoBrands: autoBrands.map(item => ({
          autoTypeId: item.autoTypeId,
          autoBrandId: item.autoBrandId,
        })),
        sellerGroupIds: groups.map(item => item.productGroupId),
      };
      return APIResponse({
        res,
        data: resData,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось получить категории продавца',
        error: err,
      });
    }
  };
}

export default UsersCtrl;
