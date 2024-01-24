import httpStatus from 'http-status';
import { Op, Transaction } from 'sequelize';
import Address from '../../address/models/Address.model';
import FileModel from '../../files/models/File.model';
import User from '../../user/models/User.model';
import OrganizationBranch from '../models/OrganizationBranch.model';
import OrganizationUpdateApplication from '../models/OrganizationUpdateApplication.model';
import { getOrgName, getOrgStatus, getOrganizationComission } from '../utils';
import UserRoles from '../../role/models/UserRoles.model';
import Organization from '../models/Organization.model';
import OrganizationSeller from '../models/OrganizationSeller.model';
import Requisites from '../../user/models/Requisites.model';
import SellerUpdateApplication from '../../user/models/SellerUpdateApplication.model';
import OrganizationFile from '../models/OrganizationFile.model';
import OrganizationRejection from '../models/OrganizationRejection.model';
import OrganizationSellerRejection from '../models/OrganizationSellerRejection.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import Notification from '../../notification/models/Notification.model';
import { ENotificationType } from '../../notification/interfaces';
import { SERVICE_ORGANIZATION_INN } from '../data';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  id: string;
  authUser: User;
  authUserRole: UserRoles;
  transaction?: Transaction;
}

export const getOrganizationService = async ({
  id,
  authUser,
  authUserRole,
  transaction,
}: IProps): Promise<Organization> => {
  try {
    let organization = await Organization.findByPk(id as string, {
      include: [
        { model: Address, as: 'juristicAddress' },
        { model: Address, as: 'actualAddress' },
        { model: Address, as: 'mailingAddress' },
      ],
      transaction,
    });
    if (!organization)
      throw new ServiceError({
        status: httpStatus.NOT_FOUND,
        message: 'Организация не найдена',
      });

    // Transform organization
    organization = {
      ...getOrganizationComission(organization),
      ...organization.toJSON(),
    } as Organization;

    // Fetch files
    const orgFiles = await OrganizationFile.findAll({
      where: {
        organizationId: organization.id,
      },
      include: [{ model: FileModel, as: 'file' }],
      transaction,
    });
    organization.files = orgFiles.map(el => el.toJSON() as OrganizationFile);

    // Fetch branches
    const branches = await OrganizationBranch.findAll({
      where: {
        organizationId: organization.id,
      },
      include: [
        { model: Address, as: 'actualAddress' },
        {
          model: OrganizationSeller,
          as: 'sellers',
          where: {
            confirmationDate: {
              [Op.ne]: null,
            },
          },
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
          ],
          required: false,
        },
        {
          model: OrganizationSeller,
          as: 'unconfirmedSellers',
          where: {
            confirmationDate: null,
          },
          include: [{ model: User, as: 'user' }],
          required: false,
        },
      ],
      transaction,
    });

    organization.branches = branches.map(el => el.toJSON() as OrganizationBranch);

    // Fetch active sellers
    const sellers = await OrganizationSeller.findAll({
      where: {
        organizationId: organization.id,
        confirmationDate: { [Op.ne]: null },
        detachedAt: null,
      },
      include: [
        {
          model: User,
          as: 'user',
          include: [
            { model: Address, as: 'address' },
            { model: Requisites, as: 'requisites', attributes: ['id'], required: true },
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
      ],
      transaction,
    });
    organization.sellers = sellers.filter(seller => !!seller?.user).map(el => el.toJSON() as OrganizationSeller);

    // Fetch unconfirmed sellers
    const unconfirmedSellers = await OrganizationSeller.findAll({
      where: {
        organizationId: organization.id,
        confirmationDate: null,
      },
      include: [
        {
          model: User,
          as: 'user',
          required: true,
          include: [
            { model: Address, as: 'address' },
            { model: Requisites, as: 'requisites', attributes: ['id'], required: false },
          ],
        },
      ],
      transaction,
    });
    organization.unconfirmedSellers = unconfirmedSellers
      .filter(seller => !!seller.user)
      .map(el => el.toJSON() as OrganizationSeller);

    // Fetch org rejections
    const orgRejections = await OrganizationRejection.findAll({
      where: {
        organizationId: organization.id,
      },
      order: [['createdAt', 'DESC']],
      limit: 1,
      transaction,
    });
    organization.rejections = orgRejections.map(el => el.toJSON() as OrganizationRejection);

    // Fetch active update applications
    const updateApplications = await OrganizationUpdateApplication.findAll({
      where: {
        organizationId: organization.id,
        rejectedAt: null,
        confirmedAt: null,
      },
      include: [
        {
          model: User,
          as: 'user',
        },
      ],
      transaction,
    });
    organization.updateApplications = updateApplications.map(el => el.toJSON() as OrganizationUpdateApplication);

    // Fetch creator user
    const creatorUser = await User.findByPk(organization.creatorUserId, {
      include: [
        {
          model: OrganizationSeller,
          as: 'sellers',
          where: {
            organizationId: id,
          },
          include: [
            {
              model: OrganizationSellerRejection,
              as: 'rejections',
              required: false,
              order: [['createdAt', 'DESC']],
              limit: 1,
            },
          ],
        },
        { model: SellerRegisterFile, as: 'sellerRegisterFiles', include: [{ model: FileModel, as: 'file' }] },
      ],
      transaction,
    });
    organization.creatorUser = !!creatorUser ? (creatorUser.toJSON() as User) : null;

    // Fetch unread notifications
    const unreadNotifications = await Notification.findAll({
      where: {
        organizationId: organization.id,
        userId: authUser.id,
        roleId: authUserRole.roleId,
        viewedAt: null,
        type: {
          [Op.ne]: ENotificationType.dummy,
        },
      },
      transaction,
    });
    organization.unreadNotifications = unreadNotifications.map(el => el.toJSON() as Notification);

    // Handle org
    (organization as any).status = getOrgStatus(organization);
    organization.name = getOrgName(organization, true, true);
    organization.pureName = organization.name;

    // Добавления флага филиалу к которому относится продавец.
    if (authUserRole.role.label === 'seller') {
      for (let i = 0; i < organization.branches.length; ++i) {
        const index = organization.branches[i].sellers.findIndex(orgSeller => orgSeller.userId === authUser.id);
        if (~index) {
          organization.branches[i]['current'] = true;
          break;
        }
      }
    }

    organization.isServiceOrganization = organization.inn === SERVICE_ORGANIZATION_INN;

    return organization;
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при загрузке организации',
      error: err,
    });
  }
};
