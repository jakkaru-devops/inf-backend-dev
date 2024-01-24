import { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op } from 'sequelize';
import { APIError, APIResponse } from '../../../utils/api.utils';
import { executeTransaction } from '../../../utils/transactions.utils';
import User from '../../user/models/User.model';
import { PRODUCT_OFFER_STATUSES, PRODUCT_STATUSES } from '../data';
import Product from '../models/Product.model';
import ProductOffer from '../models/ProductOffer.model';
import Role from '../../role/models/Role.model';
import { ICreateProductOfferDto, IUpdateProductOfferDto } from '../interfaces/dto';
import UserRoles from '../../role/models/UserRoles.model';
import { transformProduct } from '../utils';
import AutoBrand from '../models/AutoBrand.model';
import { getPaginationParams, simplifyHtml } from '../../../utils/common.utils';
import { createNotification } from '../../notification/services/createNotification.service';
import { ENotificationType } from '../../notification/interfaces';
import { createProductOfferService } from '../services/createProductOffer.service';
import { createUserReview } from '../../user/services/createUserReview.service';
import { USER_REVIEW_STATUSES } from '../../user/data';
import Notification from '../../notification/models/Notification.model';
import { getProductService } from '../services/getProduct.service';
import { SocketServer } from '../../../core/socket';
import { createAPIMethod } from '../../../core/utils/createAPIMethod';
import catalogService from '../catalog.service';

class ProductOffersCtrl {
  io: SocketServer;

  constructor(io: SocketServer) {
    this.io = io;
  }

  /**
   * @desc      Get product offers - digitized products
   * @route     GET /catalog/product-offers
   * @query 		{ pageSize: number, page: number, status: number }
   * @success 	{ rows: ProductOffer[]; count: number; }
   * @access    Private: manager and seller
   */
  getProductOfferList = async (req: Request, res: Response) => {
    try {
      const authUser: User = req.body.authUser;
      const authUserRole: UserRoles = req.body.authUserRole;
      const { query } = req;
      const month = Number(query?.month || undefined) || null;
      const options: seq.FindAndCountOptions = {
        ...getPaginationParams(query, 10),
        distinct: true, // for exact filtering
        subQuery: false,
        include: [],
        order: [
          [{ model: Notification, as: 'notifications' }, 'createdAt', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      };
      options.where = {
        [Op.and]: [],
      };

      // Where
      if (authUserRole.role.label === 'seller') {
        options.where[Op.and].push({
          sellerId: authUser.id,
        });
      }
      if (query.status) {
        options.where[Op.and].push({
          status: query.status,
        });
      }
      if (!!month) {
        const nowDate = new Date();
        const startDate = new Date(`${month}.1.${nowDate.getFullYear()}`);
        const endDate = new Date(`${month < 12 ? month + 1 : 1}.1.${nowDate.getFullYear() + (month >= 12 ? 1 : 0)}`);
        console.log(startDate, endDate);
        options.where[Op.and].push({
          createdAt: {
            [Op.between]: [startDate, endDate],
          },
        });
      }

      // Includes
      options.include.push(
        {
          model: Product,
          as: 'product',
          required: false,
        },
        {
          model: Notification,
          as: 'notifications',
          where: {
            userId: authUser.id,
            roleId: authUserRole.roleId,
          },
          required: false,
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
      );

      options.include.push({ model: User, as: 'seller' });

      // Fetch product offers entities
      const productOffers = await ProductOffer.findAndCountAll(options);
      productOffers.rows = productOffers.rows
        .map(productOffer => productOffer.toJSON() as ProductOffer)
        .map(
          productOffer =>
            ({
              ...productOffer,
              product: transformProduct(productOffer.product),
            } as any),
        );

      const allProductOffers = await ProductOffer.findAll({
        attributes: ['id', 'createdAt'],
      });
      const filterMonths = [...new Set(allProductOffers.map(item => new Date(item.createdAt).getMonth()))];

      return APIResponse({
        res,
        data: {
          ...productOffers,
          filterMonths,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Список товаров для оцифровки не загружен',
        error: err,
      });
    }
  };

  /**
   * @desc      Get product offer - digitized product
   * @route     GET /catalog/product-offers/:id
   * @params 		id
   * @success 	ProductOffer
   * @access    Private: manager and seller
   */
  getProductOffer = createAPIMethod(
    { errorMessage: 'Ошибка. Товар для оцифровки не загружен', runTransaction: false },
    async ({ req, authUser, authUserRole }) => {
      const { id } = req.params;

      let productOffer = await ProductOffer.findOne({
        where: {
          id,
        },
      });
      productOffer = productOffer.toJSON() as ProductOffer;

      const notifications = await Notification.findAll({
        where: {
          productOfferId: productOffer.id,
          userId: authUser.id,
          roleId: authUserRole.roleId,
        },
      });
      productOffer.notifications = notifications.map(el => el.toJSON() as Notification);

      const unreadNotifications = await Notification.findAll({
        where: {
          productOfferId: productOffer.id,
          userId: authUser.id,
          roleId: authUserRole.roleId,
          viewedAt: null,
          type: {
            [Op.ne]: ENotificationType.dummy,
          },
        },
      });
      productOffer.unreadNotifications = unreadNotifications.map(el => el.toJSON() as Notification);

      let product = await getProductService({
        id: productOffer.productId,
        include: ['files', 'branches', 'applicabilities', 'analogs'],
      });

      const sourceProduct = productOffer.sourceProductId
        ? await getProductService({
            id: productOffer.sourceProductId,
            include: ['files', 'branches', 'applicabilities', 'analogs'],
          })
        : null;

      productOffer.product = product;
      if (!!sourceProduct) productOffer.sourceProduct = sourceProduct;

      return productOffer;
    },
  );

  /**
   * @desc      Create product offer - digitized product
   * @route     POST /catalog/product-offers
   * @body 		  { productOffer: ICreateProductOfferDto }
   * @success 	{ productOffer: ProductOffer }
   * @access    Private: seller
   */
  createProductOffer = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const productOfferData: ICreateProductOfferDto = req.body.productOffer;
        const sourceProductId: string = productOfferData?.sourceProductId;
        const comment: string = productOfferData?.comment;

        const { productOffer } = await createProductOfferService({
          productOffer: productOfferData,
          sourceProductId,
          comment,
          authUser,
          authUserRole,
          io: this.io,
          req,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            productOffer,
            message: 'Оцифрованный товар отправлен на рассмотрение',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка. Оцифрованный товар не отправлен на рассмотрение',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Update product offer - digitized product
   * @route     PUT /catalog/product-offers/:id
   * @params    id
   * @body 		  { productOffer: IUpdateProductOfferDto }
   * @success 	{ productOffer: ProductOffer }
   * @access    Private: seller
   */
  updateProductOffer = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.params;
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const productOfferData: IUpdateProductOfferDto = req.body.productOffer;
        const productData = productOfferData.product;

        let productOffer = await ProductOffer.findByPk(id, {
          transaction,
        });

        // Check if auth user is the owner
        if (productOffer.sellerId !== authUser.id) {
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Только отправитель заявки может ее редактировать',
          });
        }

        if (productOffer.status === PRODUCT_OFFER_STATUSES.ACCEPTED) {
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Заявка на оцифровку уже принята',
          });
        }

        // Update product offer
        productOffer = await productOffer.update(
          {
            status: PRODUCT_OFFER_STATUSES.REVIEW,
            comment: productOfferData.comment,
          },
          {
            transaction,
          },
        );

        // Update product
        const product = await catalogService.updateProduct(
          {
            ...productData,
            id: productOffer.productId,
            userId: authUser.id,
            authUserRole,
          },
          { transaction },
        );

        productOffer = await ProductOffer.findByPk(productOffer.id, {
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
          transaction,
        });

        const moderatorRole = await Role.findOne({
          where: {
            label: 'moderator',
          },
          transaction,
        });
        const moderators = await User.findAll({
          include: [
            {
              model: UserRoles,
              as: 'roles',
              where: {
                roleId: moderatorRole.id,
              },
            },
          ],
          transaction,
        });

        for (const moderator of moderators) {
          await createNotification({
            userId: moderator.id,
            role: 'moderator',
            type: ENotificationType.productOfferUpdated,
            autoread: false,
            productOfferId: productOffer.id,
            data: {
              productOffer: {
                id: productOffer.id,
                productName: transformProduct(productOffer.product).name,
              },
            },
            io: this.io,
            res,
            transaction,
          });
        }

        return APIResponse({
          res,
          data: {
            productOffer,
            product,
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при обновлении',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Accept product offer - digitized product
   * @route     POST /catalog/product-offers/:id/accept
   * @params    id
   * @body 		  { productOffer: IUpdateProductOfferDto }
   * @success 	{ productOffer: ProductOffer }
   * @access    Private: moderator
   */
  acceptProductOffer = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.params;
        const authUser: User = req.body.authUser;
        const authUserRole: UserRoles = req.body.authUserRole;
        const productOfferData: IUpdateProductOfferDto = req.body.productOffer;
        const productData = productOfferData.product;

        let productOffer = await ProductOffer.findByPk(id, {
          include: [
            {
              model: Product,
              as: 'product',
              include: [
                {
                  model: AutoBrand,
                  as: 'autoBrands',
                },
              ],
            },
            { model: Product, as: 'sourceProduct' },
          ],
          transaction,
        });

        // If product offer relates to source product
        if (!!productOffer.sourceProductId) {
          // Update source product to offered product data
          await catalogService.updateProduct(
            {
              ...productData,
              id: productOffer.sourceProductId,
              status: productOffer.sourceProduct.status,
              userId: authUser.id,
              branches: productData.branches.map(branch => ({
                ...branch,
                id: !!branch?.sourceBranchId ? branch?.id : null,
              })),
              authUserRole,
            },
            { transaction },
          );
        } else {
          // Update offered product
          await catalogService.updateProduct(
            {
              ...productData,
              id: productOffer.productId,
              status: PRODUCT_STATUSES.ACCEPTED,
              userId: authUser.id,
              authUserRole,
            },
            { transaction },
          );
        }

        const { userReview } = await createUserReview({
          status: USER_REVIEW_STATUSES.PRODUCT_OFFER,
          receiverId: productOffer.sellerId,
          orderId: null,
          productOfferId: productOffer.id,
          rating: 5,
          text: null,
          authUser,
          io: this.io,
          res,
          transaction,
        });

        // Update product offer
        productOffer = await productOffer.update(
          {
            status: PRODUCT_OFFER_STATUSES.ACCEPTED,
            addedRating: userReview.addedRating,
          },
          {
            transaction,
          },
        );

        productOffer = await ProductOffer.findByPk(productOffer.id, {
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
          transaction,
        });

        await createNotification({
          userId: productOffer.sellerId,
          role: 'seller',
          type: ENotificationType.productOfferAccepted,
          autoread: false,
          productOfferId: productOffer.id,
          data: {
            productOffer: {
              id: productOffer.id,
              productName: transformProduct(productOffer.product).name,
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            productOffer,
            message: !!productOffer.sourceProductId
              ? 'Оцифрованный товар принят'
              : 'Оцифрованный товар добавлен в каталог',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при принятии оцифрованного товара',
          error: err,
        });
      }
    });
  };

  /**
   * @desc      Decline product offer - digitized product
   * @route     POST /catalog/product-offers/:id/decline
   * @params    id
   * @body 		  { comment: string }
   * @success 	{ productOffer: ProductOffer }
   * @access    Private: moderator
   */
  rejectProductOffer = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { id } = req.params;
        const comment: string = req.body.comment;

        let productOffer = await ProductOffer.findByPk(id, {
          transaction,
        });
        productOffer = await productOffer.update(
          {
            status: PRODUCT_OFFER_STATUSES.DECLINED,
            comment: simplifyHtml(comment),
          },
          { transaction },
        );

        productOffer = await ProductOffer.findByPk(productOffer.id, {
          include: [
            {
              model: Product,
              as: 'product',
            },
          ],
          transaction,
        });

        await createNotification({
          userId: productOffer.sellerId,
          role: 'seller',
          type: ENotificationType.productOfferRejected,
          autoread: false,
          productOfferId: productOffer.id,
          data: {
            productOffer: {
              id: productOffer.id,
              productName: transformProduct(productOffer.product).name,
            },
          },
          io: this.io,
          res,
          transaction,
        });

        return APIResponse({
          res,
          data: {
            productOffer,
            message: 'Оцифрованный товар отклонен',
          },
        });
      } catch (err) {
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Ошибка при отклонение оцифрованного товара',
          error: err,
        });
      }
    });
  };
}

export default ProductOffersCtrl;
