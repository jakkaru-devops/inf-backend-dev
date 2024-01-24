import { Request, Response } from 'express';
import httpStatus from 'http-status';
import SocketIO from 'socket.io';
import seq, { Op } from 'sequelize';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { getPaginationParams, getUserName } from '../../../utils/common.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import { createNotification } from '../../notification/services/createNotification.service';
import Organization from '../../organization/models/Organization.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import Role from '../../role/models/Role.model';
import UserRoles from '../../role/models/UserRoles.model';
import Complaint from '../models/Complaint.model';
import ComplaintFile from '../models/ComplaintFile.model';
import User from '../models/User.model';
import Notification from '../../notification/models/Notification.model';
import { createNotificationForAllManagersService } from '../../notification/services/createNotificationForAllManagers.service';

class ComplaintCtrl {
  io: SocketIO.Server;

  constructor(io: SocketIO.Server) {
    this.io = io;
  }

  /**
   * @desc      Get all complaints
   * @route     GET /user/complaint/all
   * @success 	{ count: number; rows: Complaint[] }
   * @access    Private: readComplainAvailable
   */
  getAllComplaints = async (req: Request, res: Response) => {
    try {
      const { query } = req;
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const search = ((query?.search as string) || '').trim();
      const searchBy = (query?.searchBy || ['name', 'phone']) as ('name' | 'phone')[];
      const whereUser: seq.WhereOptions = {
        [Op.and]: [],
      };

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

        whereUser[Op.and].push({
          [Op.or]: or,
        });
      }

      const complaints = await Complaint.findAndCountAll({
        ...getPaginationParams(req.query, 10),
        distinct: true,
        subQuery: false,
        include: [
          {
            model: User,
            as: 'defendant',
            required: true,
            where: whereUser,
            include: [
              {
                model: OrganizationSeller,
                as: 'sellers',
                separate: true,
                include: [{ model: Organization, as: 'organization' }],
              },
            ],
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
        ],
        order: [['createdAt', 'DESC']],
      });

      return APIResponse({
        res,
        data: complaints,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список всех жалоб не был загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get user's complaints
   * @route     GET /user/complaint/list
   * @params   	{ defendantId: string, defendantRoleLabel: string }
   * @success 	{ data: Complaint[] }
   * @access    Private: readComplainAvailable
   */
  getComplaintList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const defendantId = req.query.defendantId;
      const defendantRoleLabel = req.query.defendantRoleLabel;

      const complaints = await Complaint.findAndCountAll({
        ...getPaginationParams(req.query, 10),
        where: { defendantId, defendantRoleLabel },
        include: [
          {
            model: User,
            as: 'appellant',
            include: [
              {
                model: OrganizationSeller,
                as: 'sellers',
                include: [{ model: Organization, as: 'organization' }],
              },
            ],
          },
          {
            model: ComplaintFile,
            as: 'complaintFiles',
            required: false,
            separate: true,
            include: [{ model: FileModel, as: 'file' }],
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
        ],
      });

      return APIResponse({
        res,
        data: complaints,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список жалоб не был загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Create a complaints
   * @route     POST /user/complaint
   * @body     	{
   *              defendantId: string,
   *              defendantRoleLabel: string,
   *              reason: ('spam' | 'behaviour' | 'fraud' | 'nonobservance')[],
   *              comment: string,
   *              fileIds: string
   *            }
   * @success 	{ data: Complaint }
   * @access    Private: writeComplainAvailable
   */
  createComplaint = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const defendantId = req.body?.defendantId;
        const defendantRoleLabel = req.body?.defendantRoleLabel;
        const reason: ('spam' | 'behaviour' | 'fraud' | 'nonobservance')[] = req.body.reason;
        const comment = req.body?.comment || '';
        const fileIds = req.body?.fileIds;

        // validate user and his role
        const user = await User.findOne({
          where: { id: defendantId },
          include: [
            {
              model: UserRoles,
              as: 'roles',
              separate: true,
              include: [{ model: Role, as: 'role', where: { label: defendantRoleLabel } }],
            },
          ],
        });

        if (!user) {
          throw APIError({
            res,
            status: httpStatus.NOT_FOUND,
            message: `Пользователь с id ${defendantId} и ролью ${defendantRoleLabel} не найден`,
          });
        }

        const complaint = await Complaint.create({
          appellantId: authUser.id,
          defendantId,
          defendantRoleLabel,
          reason,
          comment,
        });

        const uploadedFiles = await FileModel.findAll({ where: { id: fileIds } });

        uploadedFiles.forEach(async uploadedFile => {
          // const nowDate = FormatDate(new Date(), UPLOADS_DATE_FORMAT);

          // const newDBPath = `complaints/${authUser.id}/${complaint.id}/${nowDate}/${uploadedFile.name}`;
          // const newActualPath = `${UPLOAD_FILES_DIRECTORY}/${newDBPath}`;

          // await uploadedFile.update({ path: newDBPath });

          await ComplaintFile.create({
            complaintId: complaint.id,
            fileId: uploadedFile.id,
          });

          // await fs.promises.rename(`${UPLOAD_FILES_DIRECTORY}/${uploadedFile.path}`, newActualPath);
        });

        const defendantRole = await Role.findOne({
          where: {
            label: defendantRoleLabel,
          },
          transaction,
        });

        await createNotificationForAllManagersService({
          type: ENotificationType.newUserComplaint,
          autoread: false,
          userComplaintId: complaint.id,
          data: {
            complaint: {
              defendantId,
              defendantRoleId: defendantRole.id,
              defendantRoleLabel,
              defendantName: getUserName(user),
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: complaint,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Жалоба не была подана',
          error: err,
        });
      }
    });
  };
}

export default ComplaintCtrl;
