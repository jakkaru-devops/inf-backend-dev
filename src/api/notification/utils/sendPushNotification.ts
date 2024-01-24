import User from '../../user/models/User.model';
import DeviceToken from '../../user/models/DeviceToken.model';
import { firebaseAdmin } from '../../../core/firebaseAdmin';
import { defineNotificationContent } from './defineNotificationContent';
import Notification from '../models/Notification.model';
import { INotificationModule } from '../interfaces';
import Role from '../../role/models/Role.model';
import ChatMessage from '../../messenger/models/ChatMessage.model';
import { getUserName, replaceAll } from '../../../utils/common.utils';
import { ALL_EMOJIS, EMOJIS_CODES } from '../../messenger/data/emojis.data';
import { SEND_PUSH_NOTIFICATIONS } from '../../../config/env';

const getUserDeviceTokens = async (userId: User['id']): Promise<{ android: string[]; ios: string[] }> => {
  const deviceTokens = await DeviceToken.findAll({
    where: {
      userId,
      active: true,
    },
  });

  return {
    android: deviceTokens.filter(item => item.platform === 'android').map(item => item.token),
    ios: deviceTokens.filter(item => item.platform === 'ios').map(item => item.token),
  };
};

export const sendPushNotification = async ({
  userId,
  roleId,
  notification,
  message,
  module,
}: {
  userId: User['id'];
  roleId: Role['id'];
  notification: Notification | null;
  message: ChatMessage | null;
  module: INotificationModule;
}) => {
  try {
    if (!SEND_PUSH_NOTIFICATIONS) return;

    const tokens = await getUserDeviceTokens(userId);
    let payload: { title: string; body: string } = null;

    const notificationData: any = {
      userId,
      roleId,
      module,
    };
    if (!!notification) {
      if (notification.type === 'dummy') return;
      const content = defineNotificationContent(notification);
      if (!content) throw new Error('Notification content is not defined');

      notificationData.type = content.type;
      notificationData.data = content.data;

      payload = {
        title: 'Уведомление',
        body: content.text,
      };
    }
    if (!!message) {
      let text = message.text;
      if (!!text?.length) {
        for (let i = 0; i < EMOJIS_CODES.length; i++) {
          const emojiCode = EMOJIS_CODES[i];
          const emoji = ALL_EMOJIS[i];
          if (message.text.includes(emojiCode)) {
            text = replaceAll(text, emojiCode, emoji.emoji);
          }
        }
      }

      payload = {
        title: getUserName(message.author, 'fl'),
        body: text,
      };
    }
    if (!notification && !message) {
      throw new Error('Notification content is not defined');
    }

    if (!!tokens?.android?.length) {
      await firebaseAdmin.messaging().sendEachForMulticast({
        notification: payload,
        data: notificationData,
        android: {
          priority: 'high',
        },
        tokens: tokens.android,
      });
    }
    if (!!tokens?.ios?.length) {
      await firebaseAdmin.messaging().sendEachForMulticast({
        notification: payload,
        data: notificationData,
        apns: {
          payload: {
            aps: {
              alert: payload,
            },
          },
        },
        tokens: tokens.ios,
      });
    }
  } catch (err) {
    throw err;
  }
};
