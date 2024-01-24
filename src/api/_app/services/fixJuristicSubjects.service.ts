import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError } from '../../../utils/api.utils';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import { executeTransaction } from '../../../utils/transactions.utils';
import { Op } from 'sequelize';
import _ from 'lodash';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import OrderRequest from '../../order/models/OrderRequest.model';
import JuristicSubjectCustomer from '../../user/models/JuristicSubjectCustomer.model';
import CustomerContract from '../../user/models/CustomerContract.model';
import User from '../../user/models/User.model';

export const fixJuristicSubjectsService = async (req: Request, res: Response) => {
  executeTransaction(async transaction => {
    try {
      const { superadminAccessKey } = req.body;

      if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Not enough rights',
        });
      }

      async function updateRejectedJuristicSubjectRelations(
        id: JuristicSubject['id'],
        replaceById: JuristicSubject['id'],
      ) {
        const juristicSubject = await JuristicSubject.findByPk(id, { transaction });
        if (!juristicSubject) return;

        // Create JuristicSubjectCustomer using replaceById as juristicSubjectId
        await JuristicSubjectCustomer.findOrCreate({
          where: {
            juristicSubjectId: replaceById,
            userId: juristicSubject.creatorUserId,
          },
          defaults: {
            juristicSubjectId: replaceById,
            userId: juristicSubject.creatorUserId,
          },
          transaction,
        });

        // Update OrderRequests relations
        const orderRequests = await OrderRequest.findAll({
          where: { payerId: id },
          order: [['createdAt', 'ASC']],
          paranoid: false,
          transaction,
        });
        for (const orderRequest of orderRequests) {
          await orderRequest.update({ payerId: replaceById }, { transaction });
        }

        // Update JuristicSubjectCustomer entities
        const customers = await JuristicSubjectCustomer.findAll({
          where: { juristicSubjectId: id },
          transaction,
        });
        for (const customer of customers) {
          await JuristicSubjectCustomer.findOrCreate({
            where: {
              juristicSubjectId: replaceById,
              userId: customer.userId,
            },
            defaults: {
              juristicSubjectId: replaceById,
              userId: customer.userId,
            },
            transaction,
          });
          await customer.destroy({ force: true, transaction });
        }

        // Update CustomerContract entities
        const contracts = await CustomerContract.findAll({
          where: {
            juristicSubjectId: id,
          },
          transaction,
        });
        for (const contract of contracts) {
          await contract.update({ juristicSubjectId: replaceById }, { transaction });
        }

        // Delete reject JuristicSubject
        await JuristicSubject.destroy({
          where: { id },
          force: true,
          transaction,
        });
      }

      const juristicSubjects = await JuristicSubject.findAll({
        order: [['createdAt', 'ASC']],
        transaction,
      });
      const rejectedIds: Array<JuristicSubject['id']> = [];

      for (const juristicSubject of juristicSubjects) {
        // Skip Juristic Subject if it was rejected and was deleted
        if (rejectedIds.includes(juristicSubject.id)) continue;

        const otherJuristicSubjectsByInn = await JuristicSubject.findAll({
          where: {
            id: { [Op.ne]: juristicSubject.id },
            inn: juristicSubject.inn,
          },
        });
        if (!!otherJuristicSubjectsByInn.length) {
          // Collect all Juristic Subjects by current INN
          const allJuristicSubjectsByInn = [juristicSubject, ...otherJuristicSubjectsByInn];
          // Define main (oldest) Juristic Subject by current INN
          let mainJuristicSubjectByInn = _.orderBy(allJuristicSubjectsByInn, 'createdAt', 'asc')[0];
          if (allJuristicSubjectsByInn.some(el => el.isSpecialClient) && !mainJuristicSubjectByInn.isSpecialClient) {
            mainJuristicSubjectByInn = await JuristicSubject.findOne({
              where: {
                inn: juristicSubject.inn,
                isSpecialClient: true,
              },
              order: [['createdAt', 'ASC']],
              transaction,
            });
          }
          console.log(juristicSubject.id, juristicSubject.inn, 'Main', mainJuristicSubjectByInn.id);

          // Collect all Juristic Subjects that have to be deleted by current INN
          const rejectedJuristicSubjects = allJuristicSubjectsByInn.filter(el => el.id !== mainJuristicSubjectByInn.id);

          // Add rejected Juristic Subjects ids to global list
          rejectedIds.push(...rejectedJuristicSubjects.map(el => el.id));

          // Delete each rejected Juristic Subject and update its relations
          for (const item of rejectedJuristicSubjects) {
            await updateRejectedJuristicSubjectRelations(item.id, mainJuristicSubjectByInn.id);
          }
        }
      }

      const resultJuristicSubjects = await JuristicSubject.findAll({
        paranoid: false,
        transaction,
      });

      for (const juristicSubject of resultJuristicSubjects) {
        await JuristicSubjectCustomer.findOrCreate({
          where: {
            juristicSubjectId: juristicSubject.id,
            userId: juristicSubject.creatorUserId,
          },
          defaults: {
            juristicSubjectId: juristicSubject.id,
            userId: juristicSubject.creatorUserId,
            deletedAt: juristicSubject.deletedAt,
          },
          transaction,
        });
      }

      // Update customer users isSpecialClient status
      const allOrgCustomers = await JuristicSubjectCustomer.findAll({
        transaction,
      });
      const resolvedUserIds: Array<User['id']> = [];
      for (const orgCustomer of allOrgCustomers) {
        if (resolvedUserIds.includes(orgCustomer.userId)) continue;

        const allUserCustomsers = allOrgCustomers.filter(el => el.userId === orgCustomer.userId);
        const allCustomerOrgs = await JuristicSubject.findAll({
          where: {
            id: allUserCustomsers.map(el => el.juristicSubjectId),
          },
          transaction,
        });

        await User.update(
          {
            isSpecialClient: allCustomerOrgs.some(el => el.isSpecialClient),
          },
          {
            where: { id: orgCustomer.userId },
            limit: 1,
            transaction,
          },
        );

        resolvedUserIds.push(orgCustomer.userId);
      }

      console.log(
        'RESULT',
        resultJuristicSubjects.map(el => el.idInt + '  ' + el.id),
      );

      return res.status(httpStatus.OK).json({
        message: 'Juristic subjects fixed successfully',
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'An error has occured during JuristicSubjects fixing',
        error: err,
      });
    }
  });
};
