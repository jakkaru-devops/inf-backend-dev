import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import Role from '../../role/models/Role.model';
import { APIError } from '../../../utils/api.utils';

type IProps = {
  res: Response;
  transaction: Transaction;
};

interface IResult {
  roles: {
    customer: Role;
    seller: Role;
    superadmin: Role;
    moderator: Role;
    manager: Role;
    operator: Role;
    test: Role;
  };
}

export const createInitialRolesService = async ({ res, transaction }: IProps): Promise<IResult> => {
  try {
    // Create customer role
    const customer = await Role.create(
      {
        label: 'customer',
        favouriteProductsAvailable: true,
        cartAvailable: true,
        offersAvailable: true,
        refundAvailable: true,
        personalDataAvailable: true,
        chatAvailable: true,
        writeComplainAvailable: true,
        writeReviewAvailable: true,
        requestOrdersPlusHistoryAvailable: true,
        manageOrderRequestsAvailable: true,
        exploreOrderRequestsAndOrdersAvailable: true,
        inspectUsersInfoAvailable: true,
      },
      {
        transaction,
      },
    );

    // Create seller role
    const seller = await Role.create(
      {
        label: 'seller',
        favouriteProductsAvailable: true,
        exploreOrderRequestsAndOrdersAvailable: true,
        suggestOrdersAvailable: true,
        transportСompanyAvailable: true,
        inspectUsersInfoAvailable: true,
        writeComplainAvailable: true,
      },
      {
        transaction,
      },
    );

    // Create admin role
    const superadmin = await Role.create(
      {
        label: 'superadmin',
        manageAdminsAvailable: true,
        manageRolesAvailable: true,
        exploreAllOrderRequestsAvailable: true,
        exploreOrderRequestsAndOrdersAvailable: true,
        banAvailable: true,
        manageEmployeesAvailable: true,
      },
      {
        transaction,
      },
    );

    // Create moderator role
    const moderator = await Role.create(
      {
        label: 'moderator',
        moderateProductChangeAvailable: true,
        manageCategoriesAvailable: true,
        manageDigitizationAvailable: true,
        writeReviewAvailable: true,
      },
      {
        transaction,
      },
    );

    // Create manager role
    const manager = await Role.create(
      {
        label: 'manager',
        supportChatsAvailable: true,
        exploreAllOrderRequestsAvailable: true,
        exploreOrderRequestsAndOrdersAvailable: true,
        organizationsAvailable: true,
        manageAllSellerDataAvailable: true,
        banAvailable: true,
        inspectUsersInfoAvailable: true,
        readComplainAvailable: true,
        rewardsAvailable: true,
        moderateOrganizationsAvailable: true,
      },
      {
        transaction,
      },
    );

    // Create operator role
    const operator = await Role.create(
      {
        label: 'operator',
        supportChatsAvailable: true,
        exploreAllOrderRequestsAvailable: true,
        exploreOrderRequestsAndOrdersAvailable: true,
        organizationsAvailable: true,
        manageAllSellerDataAvailable: true,
        banAvailable: true,
        inspectUsersInfoAvailable: true,
        readComplainAvailable: true,
        rewardsAvailable: true,
        moderateOrganizationsAvailable: true,
        payOrderSellerFee: true,
      },
      {
        transaction,
      },
    );

    // Create test role
    const testRole = await Role.create(
      {
        label: 'test',
        exploreAllOrderRequestsAvailable: true,
        requestOrdersPlusHistoryAvailable: true,
        manageOrderRequestsAvailable: true,
        exploreOrderRequestsAndOrdersAvailable: true,
        suggestOrdersAvailable: true,
      },
      {
        transaction,
      },
    );

    return {
      roles: {
        customer,
        seller,
        superadmin,
        moderator,
        manager,
        operator,
        test: testRole,
      },
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: `An error has occured while creating initial user roles`,
      error: err,
      strict: true,
    });
  }
};
