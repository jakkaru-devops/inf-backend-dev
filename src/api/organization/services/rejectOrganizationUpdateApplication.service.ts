import { Response } from 'express';
import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import { APIError } from '../../../utils/api.utils';
import SocketIO from 'socket.io';
import { createNotification } from '../../notification/services/createNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import OrganizationUpdateApplication from '../models/OrganizationUpdateApplication.model';
import Organization from '../models/Organization.model';
import { getOrgName } from '../utils';

interface IProps {
  applicationId: string;
  rejectionMessage: string;
  io: SocketIO.Server;
  res: Response;
  transaction: Transaction;
}

interface IResult {
  organizationUpdateApplication: OrganizationUpdateApplication;
}

export const rejectOrganizationUpdateApplicationService = async ({
  applicationId,
  rejectionMessage,
  io,
  res,
  transaction,
}: IProps): Promise<IResult> => {
  try {
    let application = await OrganizationUpdateApplication.findOne({
      where: {
        id: applicationId,
        rejectedAt: null,
        confirmedAt: null,
      },
      order: [['createdAt', 'DESC']], // get the last application
    });
    if (!application) {
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: 'Заявка не найдена',
      });
    }

    if (!rejectionMessage?.trim()?.length) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Необходимо указать причину отказа',
      });
    }

    application = await application.update(
      {
        rejectionMessage,
        rejectedAt: new Date(),
      },
      {
        transaction,
      },
    );

    const organization = await Organization.findByPk(application.organizationId);

    await createNotification({
      userId: application.userId,
      role: 'seller',
      type: ENotificationType.organizationUpdateApplicationRejected,
      autoread: true,
      organizationId: organization.id,
      data: {
        rejectionMessage,
        organization: {
          id: organization.id,
          name: getOrgName(organization, true, true),
        },
        applicationId: application.id,
      },
      io,
      res,
      transaction,
    });

    return {
      organizationUpdateApplication: application,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Заявка на обновление данных организации не была отклонена',
      error: err,
    });
  }
};
