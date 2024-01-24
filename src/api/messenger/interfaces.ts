import Chat from './models/Chat.model';

export interface IChat extends Chat {
  unreadMessagesCount: number;
  name: string;
}

export interface IEmoji {
  emoji: string;
  name: string;
  slug: string;
  hidden?: boolean;
  html_code?: string;
}
