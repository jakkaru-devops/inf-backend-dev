import { Request, Response } from 'express';
import httpStatus from 'http-status';
import { ADMIN_ACCESS_KEY } from '../../../config/env';
import { APIError } from '../../../utils/api.utils';
import Product from '../../catalog/models/Product.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import Order from '../../order/models/Order.model';
import RequestProduct from '../../order/models/RequestProduct.model';
import { Op } from 'sequelize';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import AutoTypeBrandRelations from '../../catalog/models/relations/AutoTypeBrandRelations.model';
import OrderRequestSellerData from '../../order/models/OrderRequestSellerData.model';
import Role from '../../role/models/Role.model';
import Notification from '../../notification/models/Notification.model';
import { formatOrderRequestStatus } from '../../order/utils';
import AutoBrand from '../../catalog/models/AutoBrand.model';

export const transformOrdersService = async (req: Request, res: Response) => {
  try {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const orderRequestIds = (
      await OrderRequest.findAll({
        attributes: ['id'],
      })
    ).map(el => el.id);
    let count = orderRequestIds.length;

    const roles = {
      customer: await Role.findOne({ where: { label: 'customer' } }),
      manager: await Role.findOne({ where: { label: 'manager' } }),
      operator: await Role.findOne({ where: { label: 'operator' } }),
      seller: await Role.findOne({ where: { label: 'seller' } }),
    };

    for (const orderRequestId of orderRequestIds) {
      console.log(`Count remaining - ${count}, ${orderRequestId}`);
      count--;

      /* const orderRequest = await OrderRequest.findOne({
        where: {
          id: orderRequestId,
          payerId: {
            [Op.ne]: null,
          },
        },
      });
      if (!!orderRequest) {
        let orders = await Order.findAll({
          where: {
            orderRequestId: orderRequest.id,
          },
          include: [
            {
              model: RequestProduct,
              as: 'products',
              where: {
                isSelected: true,
              },
              required: true,
            },
          ],
        });
        orders = orders
          .map(order => order.toJSON() as Order)
          .filter(
            order =>
              !!order.products.filter(el => el.isSelected).length && (!!order?.isPickup || !!order?.transportCompanyId),
          );
        const invoiceSellerIds = orders.map(el => el.sellerId);
        await orderRequest.update({
          invoiceSellerIds: !!invoiceSellerIds.length ? JSON.stringify(invoiceSellerIds) : null,
        });
      } else {
        await OrderRequest.update(
          {
            invoiceSellerIds: null,
          },
          {
            where: {
              id: orderRequestId,
            },
            limit: 1,
          },
        );
      } */

      // await updateOrderRequestUserStatusService({
      //   orderRequestId,
      //   res,
      // });

      const orderRequest = await OrderRequest.findByPk(orderRequestId, {
        include: [
          {
            model: OrderRequestSellerData,
            as: 'sellersData',
          },
          {
            model: Order,
            as: 'orders',
          },
        ],
      });

      const lastNotifications = {
        customer: await Notification.findOne({
          where: {
            roleId: roles.customer.id,
            orderRequestId: orderRequest.id,
          },
          order: [['createdAt', 'DESC']],
        }),
        manager: await Notification.findOne({
          where: {
            roleId: roles.manager.id,
            orderRequestId: orderRequest.id,
          },
          order: [['createdAt', 'DESC']],
        }),
      };

      await orderRequest.update({
        customerLastNotificationCreatedAt: lastNotifications?.customer?.createdAt,
        managerLastNotificationCreatedAt: lastNotifications?.manager?.createdAt,
      });

      for (const order of orderRequest.orders) {
        const lastNotification = await Notification.findOne({
          where: {
            roleId: roles.seller.id,
            userId: order.sellerId,
            orderRequestId: orderRequest.id,
          },
          order: [['createdAt', 'DESC']],
        });
        await order.update({
          sellerLastNotificationCreatedAt: lastNotification?.createdAt,
        });
      }

      for (const sellerData of orderRequest.sellersData) {
        const lastNotification = await Notification.findOne({
          where: {
            roleId: roles.seller.id,
            userId: sellerData.sellerId,
            orderRequestId: orderRequest.id,
          },
          order: [['createdAt', 'DESC']],
        });
        await sellerData.update({
          lastNotificationCreatedAt: lastNotification?.createdAt,
        });
      }

      const requestProducts = await RequestProduct.findAll({
        where: {
          orderRequestId: orderRequest.id,
          productId: {
            [Op.ne]: null,
          },
        },
      });
      const describedProducts = await RequestProduct.findAll({
        where: {
          orderRequestId: orderRequest.id,
          describedProductId: {
            [Op.ne]: null,
          },
        },
      });

      await orderRequest.update({
        productIds: JSON.stringify(requestProducts.map(el => el.productId).filter(Boolean)),
      });

      const orderRequestNotifications = await Notification.findAll({
        where: {
          orderRequestId: orderRequest.id,
          type: 'createOrderRequest',
        },
      });

      const sellerIds: string[] = orderRequestNotifications.map(el => el.userId);
      const productsWithIds = requestProducts.filter(el => !!el?.productId);
      const products = await Product.findAll({
        where: {
          id: productsWithIds.map(el => el.productId),
        },
        attributes: ['id', 'autoTypeIds', 'autoBrandIds', 'groupIds'],
      });

      for (const sellerId of sellerIds) {
        const sellerAutoBrands = await SellerAutoBrands.findAll({
          where: {
            userId: sellerId,
          },
        });
        const sellerProductGroups = await SellerProductGroups.findAll({
          where: {
            userId: sellerId,
          },
        });
        const sellerProductIds: string[] = [];

        for (const product of products) {
          const productAutoTypeIds: string[] = JSON.parse(product.autoTypeIds) || [];
          const productAutoBrandIds: string[] = JSON.parse(product.autoBrandIds) || [];
          const productGroupIds: string[] = JSON.parse(product.groupIds) || [];

          for (const autoTypeId of productAutoTypeIds) {
            if (!!sellerProductIds.find(el => el === product.id)) break;

            for (const autoBrandId of productAutoBrandIds) {
              const autoBrand = await AutoBrand.findByPk(autoBrandId, {
                attributes: ['id', 'activeAutoTypeIds'],
              });
              if (!!sellerAutoBrands.find(el => el.autoTypeId === autoTypeId && el.autoBrandId === autoBrandId)) {
                if (autoBrand?.activeAutoTypeIds?.includes(autoTypeId)) {
                  sellerProductIds.push(product.id);
                  break;
                }
              }
            }
          }
          if (!productAutoTypeIds?.length) {
            for (const autoBrandId of productAutoBrandIds) {
              if (!!sellerAutoBrands.find(el => el.autoBrandId === autoBrandId)) {
                sellerProductIds.push(product.id);
                break;
              }
            }
          }

          for (const productGroupId of productGroupIds) {
            if (!!sellerProductGroups.find(el => el.productGroupId === productGroupId)) {
              if (!!sellerProductIds.find(el => el === product.id)) continue;
              sellerProductIds.push(product.id);
              break;
            }
          }
        }

        const orderRequestSellerData = await OrderRequestSellerData.findOne({
          where: {
            orderRequestId: orderRequest.id,
            sellerId,
          },
        });
        const lastNotification = await Notification.findOne({
          where: {
            roleId: roles.seller.id,
            userId: sellerId,
            orderRequestId: orderRequest.id,
          },
          order: [['createdAt', 'DESC']],
        });

        const sellerStatus = formatOrderRequestStatus(orderRequest, 'seller', sellerId)?.status;

        if (!!orderRequestSellerData) {
          await orderRequestSellerData.update({
            productsNumber: sellerProductIds.length,
            productIds: JSON.stringify(sellerProductIds),
            lastNotificationCreatedAt: lastNotification?.createdAt || orderRequest.createdAt,
            sellerStatus,
          });
        } else {
          await OrderRequestSellerData.create({
            orderRequestId: orderRequest.id,
            sellerId,
            productsNumber: sellerProductIds.length,
            productIds: JSON.stringify(sellerProductIds),
            describedProductsNumber: describedProducts.length,
            lastNotificationCreatedAt: lastNotification?.createdAt || orderRequest.createdAt,
            sellerStatus,
          });
        }
      }

      /* for (const order of orderRequest.orders) {
        const updateParams: any = {};
        if (!!orderRequest.paymentDate) {
          updateParams.paidAt = orderRequest.paymentDate;
          updateParams.status = 'PAID';
        } else {
          updateParams.status = 'OFFER';
        }
        if (!order.paidSum) {
          updateParams.paidSum = order.totalPrice;
        }
        await order.update(updateParams);
      }

      const orders = await Order.findAll({
        where: {
          orderRequestId: orderRequest.id,
        },
      });

      const unpaidSellerIds = orders.filter(el => el.status !== 'PAID').map(el => el.sellerId);
      await orderRequest.update({
        unpaidSellerIds: JSON.stringify(unpaidSellerIds),
      }); */
    }

    return res.status(httpStatus.OK).json({
      message: 'Orders successfully transformed',
    });
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'An error has occured while orders transformation',
      error: err,
    });
  }
};
