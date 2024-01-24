import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';
import { Op } from 'sequelize';

import User from '../models/User.model';

export const completeSellerRegisterValidation = async (req: Request, res: Response, next: NextFunction) => {
  const { personal } = req.body;
  const authUser: User = req.body.authUser;

  /* if (personal) {
		// Format phone number
		const personalPhone = formatPhoneNumber(personal.phone)
		// Find existing user with provided phone number and throw an error if he's found
		const userWithPhone = await User.findOne({
			where: {
				phone: personalPhone,
				id: {
					[Op.ne]: authUser.id,
				},
			},
			attributes: ['phone', 'id'],
		})
		if (userWithPhone && userWithPhone.id !== authUser.id) {
			throw APIError({
				res,
				status: httpStatus.BAD_REQUEST,
				message: 'Пользователь с этим номером телефона уже зарегистрирован',
			})
		}
		// Find existing user with provided email and throw an error if he's found
		const userWithEmail = await JuristicSubject.findOne({
			where: {
				email: personal.email,
				userId: {
					[Op.ne]: null,
				},
			},
			attributes: ['email', 'userId'],
		})
		if (userWithEmail) {
			throw APIError({
				res,
				status: httpStatus.BAD_REQUEST,
				message: 'Пользователь с этим E-mail адресом уже зарегистрирован',
			})
		}
	} */

  next();
};
