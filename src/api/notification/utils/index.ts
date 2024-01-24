import { NOTIFICATION_MODULES } from '../data';
import { INotificationModule } from '../interfaces';
import Notification from '../models/Notification.model';

export const defineNotificationModule = (notification: Notification): INotificationModule | null => {
  if (!notification) return null;
  if (!!notification?.organizationId) return 'organizations';
  const keys = Object.keys(NOTIFICATION_MODULES) as INotificationModule[];
  for (const key of keys) {
    if (NOTIFICATION_MODULES?.[key]?.includes(notification?.type)) return key;
  }
  return null;
};
