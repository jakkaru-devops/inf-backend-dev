import { Request, Response } from 'express';
import User from '../../user/models/User.model';
import httpStatus from 'http-status';
import Address from '../../address/models/Address.model';
import { APIError } from '../../../utils/api.utils';
import OrderRequest from '../models/OrderRequest.model';
import Order from '../models/Order.model';
import Reward from '../models/Reward.model';
import Requisites from '../../user/models/Requisites.model';
import {
  convertAddressToString,
  gaussRound,
  getUserName,
  padZero,
  separateNumberBy,
} from '../../../utils/common.utils';
import numberToWordsRu from 'number-to-words-ru';
import { generatePdfFromTemplate } from '../../../utils/pdf.utils';
import formatDate from 'date-fns/format';
import RequestProduct from '../models/RequestProduct.model';
import { addNdflToNumber } from '../utils';
import _ from 'lodash';
import { Op } from 'sequelize';
import { SELLER_OFFER_DOC_NAME } from '../../../config/env';
import addDate from 'date-fns/add';

interface IProps {
  givenAtPeriod: string;
  sellerId: User['id'];
  req: Request;
  res: Response;
}

interface IResult {
  title: string;
  file: Buffer;
}

export const getMonthRewardListService = async ({ givenAtPeriod, sellerId, req, res }: IProps): Promise<IResult> => {
  try {
    const givenAtMonthArr = givenAtPeriod.split('.').filter((__, i) => i > 0);
    if (givenAtMonthArr.length !== 2)
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'Неверный формат даты',
      });
    const givenAtMonth = givenAtMonthArr.join('.');
    const monthPeriod: 'start' | 'end' = givenAtPeriod.startsWith('01') ? 'start' : 'end';
    givenAtMonth;

    const givenAt = {
      year: Number(givenAtMonthArr[1]),
      month: Number(givenAtMonthArr[0]) - 1,
    };
    const givenAtDate = new Date(givenAt.year, givenAt.month, monthPeriod === 'start' ? 1 : 16);
    const monthMiddle = new Date(givenAt.year, givenAt.month, 16);
    const nowDate = new Date();
    const currentPeriodStartDate = new Date(
      `${nowDate.getFullYear()}-${nowDate.getMonth() + 1}-${nowDate.getDate() < 16 ? 1 : 16}`,
    );
    currentPeriodStartDate.setDate(currentPeriodStartDate.getDate() < 16 ? 1 : 16);

    console.log(givenAtDate);
    console.log(currentPeriodStartDate);

    if (givenAtDate.getTime() >= currentPeriodStartDate.getTime()) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: 'За этот период отчет еще не сформирован',
      });
    }

    let rewardEntities = (
      await Reward.findAll({
        where: {
          sellerId,
          givenAtMonth,
          givenAt:
            monthPeriod === 'start'
              ? {
                  [Op.lte]: monthMiddle,
                }
              : {
                  [Op.gte]: monthMiddle,
                },
        },
        order: [['givenAt', 'DESC']],
      })
    ).map(el => el.toJSON() as Reward);
    rewardEntities = _.uniqBy(rewardEntities, 'orderId');

    for (const reward of rewardEntities) {
      const order = await Order.findByPk(reward.orderId, {
        include: [
          {
            model: RequestProduct,
            as: 'products',
          },
        ],
      });
      const orderRequest = await OrderRequest.findByPk(order.orderRequestId, {
        attributes: ['idOrder', 'createdAt'],
      });
      reward.order = {
        ...order.toJSON(),
        orderRequest: orderRequest.toJSON(),
      } as Order;
    }
    const seller = await User.findByPk(sellerId, {
      include: [
        { model: Address, as: 'address', required: true },
        { model: Requisites, as: 'requisites', required: true },
      ],
    });

    if (!rewardEntities)
      throw APIError({
        res,
        status: httpStatus.NOT_FOUND,
        message: `Вознаграждения за период ${givenAtPeriod} не найдены`,
      });

    const orders = [];
    // let totalPrice = 0;
    let totalReward = 0;

    rewardEntities.forEach((reward, i) => {
      const orderPrice = gaussRound(reward.order.totalPrice, 2);
      const rewardSum = reward.amount;
      orders.push({
        number: i + 1,
        idOrder: reward.order.orderRequest.idOrder,
        date: formatDate(new Date(reward.order.orderRequest.createdAt), 'dd.MM.yyyy'),
        count: 1,
        reward: separateNumberBy(rewardSum, ' ').replace('.', ','),
        // totalPrice: separateNumberBy(gaussRound(totalPrice, 2), ' ').replace('.', ','),
      });

      // totalPrice += orderPrice;
      totalReward += rewardSum;
    });
    totalReward = gaussRound(totalReward, 2);
    const totalRewardWithNdfl = addNdflToNumber(totalReward);

    const months = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];
    function getDaysNumberInMonth(month: number, year: number) {
      return new Date(year, month, 0).getDate();
    }
    function getNumberFloatPart(num: number): string {
      const str = num.toFixed(2).toString();
      const arr = str.split('.');
      return padZero(Number(arr[1]));
    }

    const allSellerRewards = await Reward.findAll({
      where: {
        givenAt: {
          [Op.ne]: null,
        },
        sellerId,
      },
      order: [['givenAt', 'DESC']],
    });
    const rewardsPeriodsObj: { [month: string]: Reward[] } = allSellerRewards.reduce((a, reward) => {
      const rewardDate = new Date(reward.givenAt);
      const monthDays = getDaysNumberInMonth(rewardDate.getMonth() + 1, rewardDate.getFullYear());
      const monthPeriod: string = new Date(reward.givenAt).getDate() < 16 ? '1-15' : `16-${monthDays}`;
      const key = `${rewardDate.getFullYear()}.${rewardDate.getMonth() + 1}.${monthPeriod}`; // needed to define doc number
      a[key] = null;
      return a;
    }, {});
    const rewardPeriods = _.orderBy(Object.keys(rewardsPeriodsObj).filter(Boolean), null, 'asc');
    let givenAtPeriodReverse = `${givenAtDate.getFullYear()}.${givenAtDate.getMonth() + 1}.${givenAtPeriod
      .split('.')[0]
      .replace('01', '1')}`;
    const monthIndex = rewardPeriods.findIndex(el => el === givenAtPeriodReverse);

    if (monthIndex === -1) {
      throw APIError({
        res,
        status: httpStatus.BAD_REQUEST,
        message: `За период ${givenAtMonth} нет вознаграждений`,
      });
    }

    const dayEndOfPeriod = monthPeriod === 'start' ? 15 : getDaysNumberInMonth(givenAt.month + 1, givenAt.year);
    console.log('PERIOD', monthPeriod);
    const docDate = new Date(givenAt.year, givenAt.month, 15);
    let docEndDate = new Date(givenAt.year, givenAt.month, dayEndOfPeriod);
    const now = new Date();
    const docNumber = monthIndex + 1;
    const totalAmountInWords = numberToWordsRu.convert(totalRewardWithNdfl);

    if (docEndDate.getTime() > now.getTime()) docEndDate = new Date(givenAt.year, givenAt.month, now.getDate());

    let title = `Акт № ${docNumber} от ${dayEndOfPeriod} ${months[docDate.getMonth()]} ${docDate.getFullYear()} г.`;

    const pdf = await generatePdfFromTemplate({
      data: {
        title,
        orders,
        ordersLength: orders.length,
        docNumber,
        confirmingDocName:
          !!seller?.sellerOfferDocName && !!seller?.sellerOfferDocDate
            ? `Агентский договор № ${seller?.sellerOfferDocName} от ${formatDate(
                new Date(seller?.sellerOfferDocDate),
                'dd.MM.yyyy',
              )} г.`
            : SELLER_OFFER_DOC_NAME,
        totalAmount: {
          total: separateNumberBy(gaussRound(totalReward, 2), ' ').replace('.', ','),
          totalWithNdfl: separateNumberBy(gaussRound(totalRewardWithNdfl, 2), ' ').replace('.', ','),
          int: Math.floor(totalRewardWithNdfl),
          float: getNumberFloatPart(totalRewardWithNdfl).replace('.', ','),
        },
        seller: {
          full: [
            getUserName(seller, 'full'),
            `паспорт РФ ${seller.requisites.passportSeries} № ${seller.requisites.passportNumber}`,
            `выдан ${seller.requisites.passportGiver} ${formatDate(
              new Date(seller.requisites.passportGettingDate),
              'dd.MM.yyyy',
            )}`,
            `зарегистрированный по адресу: ${convertAddressToString(seller.address)}`,
          ].join(', '),
          name: getUserName(seller),
          passportSeries: seller.requisites.passportSeries,
          passportNumber: seller.requisites.passportNumber,
          address: convertAddressToString(seller.address),
        },
        totalAmountInWords,
      },
      pathToTemplate: `templates/monthRewards.hbs`,
    });

    return {
      title: 'Акт Продавец Ф_Л',
      file: pdf,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ошибка при формировании списка вознаграждений',
      error: err,
    });
  }
};
