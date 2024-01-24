import httpStatus from 'http-status';
import { Transaction } from 'sequelize';
import Address from '../../address/models/Address.model';
import { transformAddress } from '../../address/utils';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import Requisites from '../models/Requisites.model';
import User from '../models/User.model';
import { updateSellerProductCategoriesService } from './updateSellerProductCategories.service';
import { validateEmail } from '../../../utils/common.utils';
import { ServiceError } from '../../../core/utils/serviceError';

interface IProps {
  userData: User;
  transaction: Transaction;
}

interface IResult {
  user: User;
}

export const updateUserService = async ({ userData, transaction }: IProps): Promise<User> => {
  const updateUserData = {};

  if (userData.email) {
    if (!validateEmail(userData.email))
      throw new ServiceError({ status: httpStatus.BAD_REQUEST, message: 'Некорректный email' });

    updateUserData['email'] = userData.email;
  }
  if (userData.firstname) updateUserData['firstname'] = userData.firstname;
  if (userData.lastname) updateUserData['lastname'] = userData.lastname;
  if (userData.middlename) updateUserData['middlename'] = userData.middlename;
  if (typeof userData.avatar !== 'undefined') updateUserData['avatar'] = userData.avatar;
  if (typeof userData.sellerOfferDocName !== 'undefined')
    updateUserData['sellerOfferDocName'] = userData.sellerOfferDocName;
  if (typeof userData.sellerOfferDocDate !== 'undefined')
    updateUserData['sellerOfferDocDate'] = userData.sellerOfferDocDate;

  // Find user
  let user = await User.findByPk(userData.id, {
    include: [
      {
        model: Requisites,
        as: 'requisites',
        attributes: ['id', 'userId'],
        required: false,
      },
      {
        model: Address,
        as: 'address',
        attributes: ['id'],
        required: false,
      },
      {
        model: SellerRegisterFile,
        as: 'sellerRegisterFiles',
        required: false,
      },
      {
        model: SellerAutoBrands,
        as: 'sellerAutoBrands',
        required: false,
      },
      {
        model: ProductGroup,
        as: 'sellerProductGroups',
        required: false,
      },
    ],
    transaction,
  });

  let requisites: Requisites = null;

  if (userData?.requisites) {
    if (user?.requisites) {
      requisites = await user.requisites.update(
        {
          ...userData.requisites,
        },
        {
          transaction,
        },
      );
    } else {
      requisites = await Requisites.create(
        {
          ...userData.requisites,
          userId: user.id,
        },
        {
          transaction,
        },
      );
    }
  }

  // Create seller register files it they are provided
  if (!!userData.sellerRegisterFiles) {
    for (const regFileData of userData.sellerRegisterFiles) {
      const regFile = await SellerRegisterFile.findOne({
        where: {
          userId: user.id,
          label: regFileData.label,
        },
        transaction,
      });
      if (!!regFile && regFile.fileId !== regFileData.file.id) {
        await regFile.destroy({ transaction });
      }

      await SellerRegisterFile.create(
        {
          userId: user.id,
          fileId: regFileData.file.id,
          label: regFileData.label,
        },
        { transaction },
      );
    }
  }

  // Create or update user address
  if (userData?.address) {
    let address: Address = null;
    if (!!userData.address) {
      if (!!user.address) {
        address = await user.address.update(
          transformAddress({
            ...userData.address,
          }),
          {
            transaction,
          },
        );
      } else {
        address = await Address.create(
          transformAddress({
            ...userData.address,
          }),
          {
            transaction,
          },
        );
      }
    }

    updateUserData['addressId'] = address.id;
  }

  if (!!userData.sellerAutoBrands || !!userData.sellerProductGroups) {
    await updateSellerProductCategoriesService({
      userId: user.id,
      autoBrands: (userData?.sellerAutoBrands || []).filter(Boolean),
      productGroupIds: (userData?.sellerProductGroups?.map(el => el.id) || []).filter(Boolean),
      transaction,
    });
  }

  // Update user
  user = await user.update(updateUserData, {
    transaction,
  });

  // Format user
  user = user.toJSON() as User;
  if (!!userData?.requisites) user.requisites = requisites.toJSON() as Requisites;

  return user;
};
