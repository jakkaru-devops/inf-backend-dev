import { Response } from 'express';
import httpStatus from 'http-status';
import seq, { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import Address from '../../address/models/Address.model';
import FileModel from '../../files/models/File.model';
import User from '../../user/models/User.model';
import OrganizationUpdateApplication from '../models/OrganizationUpdateApplication.model';
import OrganizationUpdateApplicationBranch from '../models/OrganizationUpdateApplicationBranch.model';
import OrganizationUpdateApplicationFile from '../models/OrganizationUpdateApplicationFile.model';
import { getOrgName } from '../utils';

interface IProps {
  applicationId: string;
  authUser: User;
  organizationId?: string;
  status?: 'any';
  res: Response;
  transaction?: Transaction;
}

interface IResult {
  organizationUpdateApplication: OrganizationUpdateApplication;
}

export const getOrganizationUpdateApplicationService = async ({
  applicationId,
  authUser,
  organizationId,
  status,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    const where: seq.WhereOptions = {};

    if (!!organizationId) {
      where.organizationId = organizationId;
      where.userId = authUser.id;
    } else {
      where.id = applicationId;
    }

    if (!status || status !== 'any') {
      where.confirmedAt = null;
      where.rejectedAt = null;
    }

    let application = await OrganizationUpdateApplication.findOne({
      where,
      order: [['createdAt', 'DESC']], // get the last application
      include: [
        {
          model: Address,
          as: 'juristicAddress',
        },
        {
          model: Address,
          as: 'actualAddress',
        },
        {
          model: Address,
          as: 'mailingAddress',
        },
        {
          model: OrganizationUpdateApplicationBranch,
          as: 'branches',
          include: [
            {
              model: Address,
              as: 'actualAddress',
            },
          ],
        },
        {
          model: OrganizationUpdateApplicationFile,
          as: 'files',
          include: [
            {
              model: FileModel,
              as: 'file',
            },
          ],
        },
      ],
      transaction,
    });

    if (!application) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Заявка на найдена',
      });
    }

    application = application.toJSON() as OrganizationUpdateApplication;
    application.name = getOrgName(application, true, true);

    return {
      organizationUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных организации не загружена',
      error: err,
    });
  }
};
