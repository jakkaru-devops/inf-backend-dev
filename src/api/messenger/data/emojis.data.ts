import fs from 'fs';
import path from 'path';
import appRoot from 'app-root-path';
import { IEmoji } from '../interfaces';

export const DATA_BY_EMOJI = JSON.parse(
  fs.readFileSync(path.join(appRoot + '/src/api/messenger/data/data-by-emoji.json')) as any,
);
export const EMOJIS_OBJ = DATA_BY_EMOJI as any as {
  [key: string]: IEmoji;
};
export const ALL_EMOJIS = Object.keys(EMOJIS_OBJ)
  .map(key => ({
    ...EMOJIS_OBJ[key],
    emoji: key,
  }))
  .filter(emoji => !emoji?.hidden && !!emoji?.html_code);
export const EMOJIS_CODES = ALL_EMOJIS.map(emoji => emoji?.html_code).filter(Boolean);
