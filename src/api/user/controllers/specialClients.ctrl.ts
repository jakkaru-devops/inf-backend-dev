import { Request, Response } from 'express';
import { APIError, APIResponse } from '../../../utils/api.utils';
import httpStatus from 'http-status';
import JuristicSubject from '../models/JuristicSubject.model';
import User from '../models/User.model';
import CustomerContract from '../models/CustomerContract.model';
import CustomerContractSpecification from '../models/CustomerContractSpecification.model';
import FileModel from '../../files/models/File.model';
import { executeTransaction } from '../../../utils/transactions.utils';
import UserRoles from '../../role/models/UserRoles.model';
import JuristicSubjectCustomer from '../models/JuristicSubjectCustomer.model';

class SpecialClientsCtrl {
  getAllSpecialClientsList = async (req: Request, res: Response) => {
    try {
      let juristicSubjects = (
        await JuristicSubject.findAll({
          where: { isSpecialClient: true },
          include: [{ model: User, as: 'customers' }],
        })
      ).map(el => el.toJSON() as JuristicSubject);

      for (const juristicSubject of juristicSubjects) {
        for (const customerUser of juristicSubject.customers) {
          const contracts = await CustomerContract.findAll({
            where: {
              customerId: customerUser.id,
              juristicSubjectId: juristicSubject.id,
            },
            include: [
              {
                model: CustomerContractSpecification,
                as: 'specifications',
                separate: true,
                include: [{ model: FileModel, as: 'file' }],
              },
              { model: FileModel, as: 'file', required: true },
            ],
          });
          customerUser.customerContracts = contracts.map(el => el.toJSON() as CustomerContract);
        }
      }

      juristicSubjects = juristicSubjects.filter(el => !!el?.customers?.length);

      return APIResponse({
        res,
        data: juristicSubjects,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список особых клиентов не загружен',
      });
    }
  };

  createCustomerContract = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const contractData = req.body.contract;
        const customerId = authUserRole.role.label === 'customer' ? authUser.id : contractData?.customerId;
        const {
          juristicSubjectId,
          fileId,
          name,
          number,
          date,
          directorFirstName,
          directorLastName,
          directorMiddleName,
          directorPost,
          basisName,
          signerIsDirector,
          signerFirstName,
          signerLastName,
          signerMiddleName,
          signerPost,
        } = contractData;

        if (
          !fileId ||
          !name ||
          !number ||
          !date ||
          !directorFirstName ||
          !directorLastName ||
          !directorMiddleName ||
          !directorPost ||
          !basisName ||
          (!signerIsDirector && (!signerFirstName || !signerLastName || !signerMiddleName || !signerPost))
        )
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо заполнить все обязательные поля',
          });

        const contract = await CustomerContract.create(
          {
            customerId,
            creatorUserId: authUser.id,
            juristicSubjectId,
            fileId,
            name,
            number,
            date,
            directorFirstName,
            directorLastName,
            directorMiddleName,
            directorPost,
            basisName,
            signerIsDirector,
            signerFirstName,
            signerLastName,
            signerMiddleName,
            signerPost,
          },
          { transaction },
        );

        return APIResponse({
          res,
          data: contract,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при сохранении договора',
          error: err,
        });
      }
    });
  };

  updateCustomerContract = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const { contractId } = req.params;
        const {
          fileId,
          name,
          number,
          date,
          directorFirstName,
          directorLastName,
          directorMiddleName,
          directorPost,
          basisName,
          signerIsDirector,
          signerFirstName,
          signerLastName,
          signerMiddleName,
          signerPost,
        } = req.body.contract;

        if (
          !fileId ||
          !name ||
          !number ||
          !date ||
          !directorFirstName ||
          !directorLastName ||
          !directorMiddleName ||
          !directorPost ||
          !basisName ||
          (!signerIsDirector && (!signerFirstName || !signerLastName || !signerMiddleName || !signerPost))
        )
          throw APIError({
            res,
            status: httpStatus.BAD_REQUEST,
            message: 'Необходимо заполнить все обязательные поля',
          });

        let contract = await CustomerContract.findByPk(contractId, { transaction });
        if (!contract)
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Договор не найден',
          });

        contract = await contract.update(
          {
            fileId,
            name,
            number,
            date,
            directorFirstName,
            directorLastName,
            directorMiddleName,
            directorPost,
            basisName,
            signerIsDirector,
            signerFirstName,
            signerLastName,
            signerMiddleName,
            signerPost,
          },
          { transaction },
        );

        return APIResponse({
          res,
          data: contract,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при сохранении договора',
          error: err,
        });
      }
    });
  };

  deleteCustomerContract = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { contractId } = req.params;
        const authUser: User = req.body.authUser;

        const contract = await CustomerContract.findByPk(contractId, { transaction });
        if (contract.creatorUserId !== authUser.id)
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Нет прав на удаление договора',
          });

        await contract.destroy({ transaction });

        return APIResponse({
          res,
          data: null,
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при удалении договора',
          error: err,
        });
      }
    });
  };
}

export default SpecialClientsCtrl;
