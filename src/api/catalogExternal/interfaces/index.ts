export interface IParams {
  type?: string;
  mark?: string;
  model?: string;
  numbers?: string;
  brands?: string;
}

export interface IProduct {
  id: number;
  type: string;
  mark_short_name: string;
  number: string;
  number_clear: string;
  name: string;
  notes: string;
  modification: string;
  index?: string;
  relevance: string;
  name_with_mark?: string;
  group?: string;
  subGroup?: string;
  coordinates?: [
    {
      top: {
        x: number;
        y: number;
      },
      bottom: {
        x: number;
        y: number;
      },
      vertical: boolean;
    }
  ]
}