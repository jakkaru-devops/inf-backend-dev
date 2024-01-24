import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { APIError, APIResponse } from '../../utils/api.utils';
import TransportCompany from './models/TransportCompany';
import { Identifier } from 'sequelize/types';
import { Op } from 'sequelize';
import User from '../user/models/User.model';
import SellerTransportCompany from '../user/models/SellerTransportCompany.model';
import Order from '../order/models/Order.model';

export default class ShippingCtrl {
  /**
   * @desc      Get full transport company list
   * @route     GET /shipping/transport-company/all
   * @success  { data: TransportCompany[] }
   * @access    Public
   */
  getAllTransportCompanies = async (req: Request, res: Response) => {
    try {
      const transportCompanies = await TransportCompany.findAll();

      return APIResponse({
        res,
        data: transportCompanies,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось получить список транспортных компаниях',
        error: err,
      });
    }
  };

  /**
   * @desc      Get sellers transport company list
   * @route     GET /user/transport-company/list
   * @success  { data: TransportCompany[] }
   * @access    Private: transportСompanyAvailable
   */
  getTransportCompanyList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const sellerTransportCompanies = await SellerTransportCompany.findAll({
        where: { sellerId: authUser.id },
        include: [
          {
            model: TransportCompany,
            as: 'transportCompany',
            required: false,
          },
        ],
      });

      return APIResponse({
        res,
        data: sellerTransportCompanies.map(({ transportCompany }) => transportCompany),
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось получить список транспортных компаниях',
        error: err,
      });
    }
  };

  /**
   * @desc      Get transport company by id or label
   * @route     GET /shipping/transport-company
   * @params    { id?: Identifier, label: string }
   * @success  { data: TransportCompany }
   * @access    Public
   */
  getTransportCompany = async (req: Request, res: Response) => {
    try {
      const id = (req.query?.id as Identifier) || '';
      const label = req.query?.label || '';

      const transportCompany = await TransportCompany.findOne({
        where: {
          [Op.or]: [{ id }, { label }],
        },
      });

      if (!transportCompany) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message:
            (id && 'Транспортная компания не найдена по id ' + id) ||
            (label && 'Транспортная компания не найдена по label ' + label),
        });
      }

      return APIResponse({
        res,
        data: transportCompany,
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Не удалось транспортную компанию',
        error: err,
      });
    }
  };

  /**
   * @desc      Update Seller's Transport Companies
   * @route     PUT /user/transport-company
   * @body      { transportCompanyIds?: Identifier[] }
   * @success  { data: User }
   * @access    Private: transportСompanyAvailable
   */
  updateSellersTransportCompanies = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const transportCompanyIds = req.body?.transportCompanyIds;

      const transportCompanies = await TransportCompany.findAll({
        where: { id: transportCompanyIds },
      });

      if (!transportCompanies) {
        throw APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Транспортные компании не найдены по ids ' + transportCompanyIds.join(', '),
        });
      }

      const sellerTransportCompanies = await SellerTransportCompany.findAll({
        where: {
          sellerId: authUser.id,
        },
      });

      for (const { id: transportCompanyId } of transportCompanies) {
        if (!!sellerTransportCompanies.find(el => el.transportCompanyId === transportCompanyId)) continue;
        await SellerTransportCompany.create({ sellerId: authUser.id, transportCompanyId });
      }
      for (const sellerTransportCompany of sellerTransportCompanies) {
        if (!!transportCompanies.find(el => el.id === sellerTransportCompany.transportCompanyId)) continue;
        await sellerTransportCompany.destroy({ force: true });
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
        message: 'Транспортные компании продавца не обновлены',
        error: err,
      });
    }
  };

  /**
   * @desc      Calculate prices from transport companies
   * @route     POST /shipping/prices
   * @body      IShippingBody
   * @success  { data: ITransportCompany[] }
   * @access    Public
   */

  getTransportModelList = async (req: Request, res: Response) => {
    try {
      const { orderId } = req.query;

      const order = await Order.findOne({
        where: {
          id: orderId,
        },
        attributes: ['sellerId'],
      });
      const sellerTransportList = await SellerTransportCompany.findAll({
        where: {
          sellerId: order.sellerId,
        },
        include: [
          {
            model: TransportCompany,
            as: 'transportCompany',
          },
        ],
        attributes: [],
      });
      if (sellerTransportList.length == 0) {
        const transportCompany = await TransportCompany.findAll();
        // console.log(transportCompany)
        return APIResponse({
          res,
          data: transportCompany,
        });
      } else {
        console.log(sellerTransportList);
        return APIResponse({
          res,
          data: sellerTransportList.map(transportCompany => transportCompany.transportCompany),
        });
      }
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Произошла ошибка при показе списка транспортных компаний',
        error: err,
      });
    }
  };
  dropSellerTransportCompany = async (req: Request, res: Response) => {
    try {
      const sellerId = req.body.authUser.id;
      const transportCompanyId = req.body.transportCompanyId;

      const transportCompanyForDrop = await SellerTransportCompany.findOne({
        where: {
          sellerId: sellerId,
          transportCompanyId: transportCompanyId,
        },
      });

      if (!transportCompanyForDrop) {
        return APIError({
          res,
          status: httpStatus.NOT_FOUND,
          message: 'Запись о транспортной компании продавца не найдена',
        });
      }

      await transportCompanyForDrop.destroy();
      return APIResponse({
        res,
        data: {
          message: 'Удаление прошло успешно',
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка при удалении транспортной компании у продавца',
        error: err,
      });
    }
  };
}
