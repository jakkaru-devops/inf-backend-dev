import { Op } from 'sequelize';
import { executeTransaction } from '../../../utils/transactions.utils';
import Order from '../models/Order.model';
import Reward from '../models/Reward.model';
import addDate from 'date-fns/add';
import formatDate from 'date-fns/format';

export const getAndUpdateRewardsGivenAtService = async () => {
  executeTransaction(async transaction => {
    const rewards = await Reward.findAll({
      where: {
        givenAt: null,
        amount: {
          [Op.ne]: 0,
        },
      },
      include: [
        {
          model: Order,
          as: 'order',
          where: {
            receivingDate: {
              [Op.ne]: null,
            },
          },
          required: true,
        },
      ],
      transaction,
    });

    for (const reward of rewards) {
      if (!reward?.order?.receivingDate) continue;
      const newGivenAt = addDate(new Date(reward.order.receivingDate), {
        days: 7,
      });
      if (newGivenAt.getTime() > new Date().getTime()) continue;
      await reward.update(
        {
          givenAt: newGivenAt,
          givenAtMonth: formatDate(newGivenAt, 'MM.yyyy'),
        },
        {
          transaction,
        },
      );
      console.log('UPDATE REWARD', reward.id);
    }
  });
};
