import { Op } from 'sequelize';
import SocketIO from 'socket.io';
import Address from '../../address/models/Address.model';
import DescribedProduct from '../../catalog/models/DescribedProduct.model';
import DescribedProductFile from '../../catalog/models/DescribedProductFile.model';
import FileModel from '../../files/models/File.model';
import { ENotificationType } from '../../notification/interfaces';
import Notification from '../../notification/models/Notification.model';
import { createOrderNotificationService } from '../../notification/services/createOrderNotification.service';
import { createOrderNotificationForAllManagersService } from '../../notification/services/createOrderNotificationForAllManagers.service';
import Role from '../../role/models/Role.model';
import User from '../../user/models/User.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import OrderRequestSellerData from '../models/OrderRequestSellerData.model';
import DeliveryAddress from '../../address/models/DeliveryAddress.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  io: SocketIO.Server;
  emailAddress: string;
  subjectText?: string;
  messageText?: string;
  fileIds?: string[];
}

export const createOrderRequestByEmailService = async ({
  io,
  emailAddress,
  subjectText,
  messageText,
  fileIds,
}: IProps): Promise<void> => {
  try {
    const describedProductData = {
      description: `<p>${subjectText}${!!messageText ? ` ${messageText}` : ''}</p>`,
      fileIds,
      autoBrands: [
        {
          autoTypeId: null,
          autoBrandId: null,
        },
      ],
      productGroupIds: [],
    };
    const describedProducts = [describedProductData];
    const customer = await User.findOne({
      where: {
        email: emailAddress,
      },
      include: [
        {
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
        },
      ],
    });

    if (!customer) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Пользователь по email не найден' });

    const customerRequestsCount = await OrderRequest.count({
      where: { customerId: customer.id },
      paranoid: false,
    });
    const idOrder = [customer.idInt, customerRequestsCount + 1].join('-');
    const nowDate = new Date();
    const orderRequest = await OrderRequest.create({
      idOrder,
      deliveryAddressId: customer.deliveryAddresses[0].addressId,
      customerId: customer.id,
      selectedSellerIds: null,
      comment: null,
      customerLastNotificationCreatedAt: nowDate,
      managerLastNotificationCreatedAt: nowDate,
      customerStatus: 'REQUESTED',
      managerStatus: 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION',
    });

    // Create products for request by photo/description
    if (describedProducts.length > 0) {
      for (const { description, fileIds, autoBrands, productGroupIds } of describedProducts) {
        const createdDescribedProduct = await DescribedProduct.create({
          description: description,
          productGroupIds: productGroupIds,
        });
        const uploadedFiles = await FileModel.findAll({
          where: { id: describedProductData.fileIds },
        });

        for (const uploadedFile of uploadedFiles) {
          await DescribedProductFile.create({
            describedProductId: createdDescribedProduct.id,
            fileId: uploadedFile.id,
          });
        }

        await RequestProduct.create({
          orderRequestId: orderRequest.id,
          describedProductId: createdDescribedProduct.id,
          quantity: 1,
        });
      }
    }

    const clientRoles = await Role.findOne({ where: { label: 'customer' } });

    await Notification.create({
      userId: customer.id,
      roleId: clientRoles.id,
      data: {},
      type: ENotificationType.dummy,
      autoread: false,
      orderRequestId: orderRequest.id,
      viewedAt: new Date(),
    });

    const sellers = await User.findAll({
      where: {
        sellerConfirmationDate: {
          [Op.ne]: null,
        },
      },
    });

    if (!!sellers?.length) {
      for (const seller of sellers) {
        const sellerProductIds: string[] = [];

        await OrderRequestSellerData.create({
          orderRequestId: orderRequest.id,
          sellerId: seller.id,
          productsNumber: sellerProductIds.length,
          productIds: JSON.stringify(sellerProductIds),
          describedProductsNumber: describedProducts?.length,
          lastNotificationCreatedAt: nowDate,
          sellerStatus: 'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION',
        });
      }
    }

    if (!!sellers?.length) {
      for (const seller of sellers) {
        createOrderNotificationService({
          userId: seller.id,
          role: 'seller',
          type: ENotificationType.createOrderRequest,
          autoread: false,
          orderRequest,
          customer,
          seller,
          io,
        });
      }
    }

    createOrderNotificationForAllManagersService({
      type: ENotificationType.createOrderRequest,
      autoread: false,
      orderRequest,
      customer,
      io,
    });
  } catch (err) {
    console.error('createOrderRequestByEmailService', err);
  }
};
