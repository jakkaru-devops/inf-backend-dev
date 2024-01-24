import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError, APIResponse } from '../../utils/api.utils';
import SocketIO from 'socket.io';
import { executeTransaction } from '../../utils/transactions.utils';
import { ENotificationType } from '../notification/interfaces';
import { createNotification } from '../notification/services/createNotification.service';
import User from '../user/models/User.model';
import Role from './models/Role.model';
import UserRoles from './models/UserRoles.model';
import addDate from 'date-fns/add';
import { IUserRoleOption } from './interfaces';

export default class RoleCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }

  /**
   * @desc      Get all roles
   * @route     GET /role
   * @success 	{ data: Roles }
   * @access    Private: manageRolesAvailable
   */
  getRoles = async (req: Request, res: Response) => {
    try {
      const roles = await Role.findAll();

      return APIResponse({
        res,
        data: roles,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Roles not loaded',
        error: err,
      });
    }
  };

  /**
   * @desc      Get role by id
   * @route     GET /role/:id
   * @success 	{ data: Role }
   * @access    Private: manageRolesAvailable
   */
  getRoleById = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const role = await Role.findOne({ where: { id } });

      if (!role) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Role not found by id ' + id,
        });
      }

      return APIResponse({
        res,
        data: role,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Role not loaded',
        error: err,
      });
    }
  };

  /**
   * @desc      Create new Role
   * @route     POST /role
   * @body      { label: string; permissions: string[] }
   * @success 	{ data: Role }
   * @access    Private: manageRolesAvailable
   */
  createRole = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { label, permissions } = req.body;

        // Is Role.label unique (?)

        // const role = await Role.findOne({ where: { label }, transaction: t });

        // if (role) {
        //   throw APIError({
        //     res,
        //     status: httpStatus.BAD_REQUEST,
        //     message: "Role has already created with label " + label,
        //   });
        // }

        const role = await Role.create({
          label,
          permissions,
        });

        return APIResponse({
          res,
          data: role,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Role was not created',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Update Role
   * @route     PUT /role/:id
   * @body      { label?: string; permissions?: string[] }
   * @success 	{ data: Role }
   * @access    Private: manageRolesAvailable
   */
  updateRole = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { id } = req.params;
        const { label, permissions } = req.body;

        const role = await Role.findOne({ where: { id }, transaction: t });

        if (!role) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Role not found by id ' + id,
          });
        }

        const updatedRole = await role.update(
          {
            ...(label && { label }),
            ...(permissions && { permissions }),
          },
          { transaction: t },
        );

        return APIResponse({
          res,
          data: updatedRole,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Role was not created',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Add Role to User
   * @route     POST /user/:userId/role
   * @body      { roleId: string }
   * @success 	{ data: User }
   * @access    Private: manageRolesAvailable
   */
  addRoleToUsers = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { userId } = req.params;
        const { roleId } = req.body;

        const user = await User.findOne({
          where: { id: userId },
          transaction: t,
        });

        if (!user) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'User not found by id ' + roleId,
          });
        }

        const role = await Role.findOne({
          where: { id: roleId },
          transaction: t,
        });

        if (!role) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Role not found by id ' + roleId,
          });
        }

        const userRole = await UserRoles.findOne({
          where: { roleId, userId },
          transaction: t,
        });

        if (userRole) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'User already has a role with id ' + roleId,
          });
        }

        await UserRoles.create({ userId: user.id, roleId: role.id }, { transaction: t });

        const userWithRole = await User.findOne({
          where: { id: user.id },
          include: [
            {
              model: UserRoles,
              as: 'roles',
              include: [
                {
                  model: Role,
                  as: 'role',
                  required: true,
                },
              ],
            },
          ],
          transaction: t,
        });

        return APIResponse({
          res,
          data: userWithRole,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Role was not added',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete User's Role
   * @route     DELETE /user/:userId/role
   * @body      { roleId: string }
   * @success 	{ data: User }
   * @access    Private: manageRolesAvailable
   */
  removeUserRole = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { userId } = req.params;
        const { roleId } = req.body;

        const user = await User.findOne({
          where: { id: userId },
          transaction: t,
        });

        if (!user) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'User not found by id ' + roleId,
          });
        }

        const role = await Role.findOne({
          where: { id: roleId },
          transaction: t,
        });

        if (!role) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Role not found by id ' + roleId,
          });
        }

        await UserRoles.destroy({
          where: { userId: user.id, roleId: role.id },
          transaction: t,
        });

        const userWithRole = await User.findOne({
          where: { id: user.id },
          include: [
            {
              model: UserRoles,
              as: 'roles',
              include: [
                {
                  model: Role,
                  as: 'role',
                  required: true,
                },
              ],
            },
          ],
          transaction: t,
        });

        return APIResponse({
          res,
          data: userWithRole,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Role was not removed from User',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Delete role by id
   * @route     DELETE /role/:id
   * @success 	{ id: string, message: string }
   * @access    Private: manageRolesAvailable
   */
  destroyRole = async (req: Request, res: Response) => {
    executeTransaction(async t => {
      try {
        const { id } = req.params;

        const role = await Role.findOne({ where: { id }, transaction: t });

        if (!role) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: 'Role not found by id ' + id,
          });
        }

        await role.destroy({ transaction: t });

        return APIResponse({
          res,
          data: {
            id,
            message: 'Role has successfully deleted',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Role not deleted',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Punish user role by id
   * @route     POST /user/punish
   * @params    { userId: Identifier, roleLabel: 'customer' | 'seller' | 'moderator' | 'manager' | 'all' }
   * @body      {
   *              requestsBanWeeks: number | null,
   *              banWeeks: number | null,
   *              reason: ('spam' | 'behaviour' | 'fraud' | 'nonobservance')[] | null
   *            }
   * @success 	{ message: string }
   * @access    Private: banAvailable
   */
  punishUserRole = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { minusRating, requestsBanWeeks, banWeeks, reasons } = req.body;
        const userId = req.query.userId as string;
        const roleLabel = req.query.roleLabel as IUserRoleOption;

        if (![].concat(roleLabel).filter(Boolean).length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо указать роль пользователя',
          });
        }

        const userRoles = await UserRoles.findAll({
          where: { userId },
          include: [
            {
              model: Role,
              as: 'role',
              required: true,
              where: (roleLabel as IUserRoleOption | 'all') !== 'all' ? { label: roleLabel } : {},
            },
          ],
          transaction,
        });

        const allUserRoles = await UserRoles.findAll({
          where: { userId },
          include: [
            {
              model: Role,
              as: 'role',
              required: true,
            },
          ],
          transaction,
        });

        if (!userRoles?.length) {
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Роль пользователя не найдена',
          });
        }

        const updateParams = {
          requestsBannedUntil: requestsBanWeeks
            ? addDate(new Date(), {
                weeks: requestsBanWeeks,
              })
            : null,
          bannedUntil: banWeeks
            ? addDate(new Date(), {
                weeks: banWeeks,
              })
            : null,
          bannedReason: reasons,
        };

        if (userRoles.length === 1) {
          const userRole = userRoles[0];
          const notificationData: any = {
            roles: userRoles.map(({ role, bannedUntil }) => ({ id: role.id, label: role.label, bannedUntil })),
            allRoles: userRoles.length === allUserRoles.length,
          };

          let type: ENotificationType = null;
          if (!userRole.bannedUntil && !!updateParams.bannedUntil) {
            type = ENotificationType.userRoleBanned;
          } else if (!!userRole.bannedUntil && !updateParams.bannedUntil) {
            type = ENotificationType.userRoleUnbanned;
          } else if (!userRole.bannedUntil && !updateParams.bannedUntil) {
            if (!userRole.requestsBannedUntil && !!updateParams.requestsBannedUntil) {
              type = ENotificationType.userOrderRequestsBanned;
            } else if (!!userRole.requestsBannedUntil && !updateParams.requestsBannedUntil) {
              type = ENotificationType.userOrderRequestsUnbanned;
            }
          }

          if (!!type) {
            if ([ENotificationType.userRoleBanned, ENotificationType.userOrderRequestsBanned].includes) {
              notificationData.reasons = reasons;
            }

            await createNotification({
              userId,
              role: roleLabel,
              type,
              autoread: true,
              data: notificationData,
              io: this.io,
              res,
              transaction,
            });
          }
        }

        for (const userRole of userRoles) {
          await userRole.update(updateParams, {
            transaction,
          });
        }

        if (typeof minusRating === 'number') {
          const user = await User.findByPk(userId, { transaction });
          let newRatingValue = user.ratingValue - minusRating;
          if (newRatingValue < 0) newRatingValue = 0;
          await User.update(
            { minusRating },
            {
              where: {
                id: userId,
              },
              transaction,
            },
          );
          if ([1, 2, 3].includes(minusRating)) {
            await createNotification({
              userId,
              role: roleLabel,
              type: ENotificationType.sellerDowngraded,
              autoread: true,
              data: {
                reasons,
                minusRating,
                newRatingValue,
              },
              io: this.io,
              res,
              transaction,
            });
          }
        }

        return APIResponse({
          res,
          data: {
            message: 'Меры наказания пользователя были успешно обновлены',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Не удалось заблокировать пользователя',
          error: err,
        });
      }
    });
  };
}
