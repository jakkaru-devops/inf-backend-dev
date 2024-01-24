import { FIXED_PRODUCT_GROUPS_KUZOV } from './fixCategories';

interface IFixedAutoTypeTree {
  label: string;
  autoBrands: Array<{
    labels: string[];
    groups: Array<{
      from: string[];
      to?: string[];
    }>;
  }>;
}

export const FIXED_CATEGORIES_BY_AUTO_TYPES: IFixedAutoTypeTree[] = [
  {
    label: 'legkovye',
    autoBrands: [
      {
        labels: ['daewoo', 'chevrolet'],
        groups: [
          {
            from: ['dopolnitelnoe_oborudovanie', 'otbor_moshchnosti'], // OK
          },
        ],
      },
      {
        labels: ['peugeot', 'citroen'],
        groups: [
          {
            from: ['khodovaya_chast', 'podveska'], // FIXED AND DELETED
          },
        ],
      },
      {
        labels: ['ford', 'toyota', 'lexus'],
        groups: [
          {
            from: ['khodovaya_chast', 'gusenitsi_i_katki_opornie'], // FIXED
            to: ['khodovaya_chast', 'kolesa_i_stupitsi'],
          },
        ],
      },
      {
        labels: ['mercedes-benz'],
        groups: [
          {
            from: ['kabina'], // FIXED AND DELETED
            to: ['kuzov', 'kabina_(kuzov)'],
          },
        ],
      },
      {
        labels: ['volvo'],
        groups: [
          {
            from: ['kabina'], // FIXED AND DELETED
            to: ['kuzov', 'otoplenie_i_ventilyatsiya_kabini'],
          },
        ],
      },
      {
        labels: ['vaz'],
        groups: [
          {
            from: ['kabina'], // FIXED AND DELETED
            to: ['kuzov', 'otoplenie_i_ventilyatsiya_kabini'],
          },
        ],
      },
      {
        labels: ['gaz'],
        groups: [
          {
            from: ['kabina'], // FIXED AND DELETED
            to: ['kuzov', 'otoplenie_i_ventilyatsiya_kabini'],
          },
          {
            from: ['rama'], // OK
            to: ['khodovaya_chast', 'rama'],
          },
        ],
      },
    ],
  },
  {
    label: 'gruzovye',
    autoBrands: [
      {
        labels: ['kamaz'],
        groups: [
          {
            from: ['kabina', 'obshivka_kabini'], // FIXED AND DELETED
          },
          {
            from: ['kabina', 'remni_bezopasnosti'], // FIXED AND DELETED
          },
          {
            from: ['rama'], // OK
            to: ['khodovaya_chast', 'rama'],
          },
          {
            from: ['fiting'], // FIXED AND DELETED
            to: ['fitingi'],
          },
        ],
      },
      {
        labels: ['maz', 'ural', 'kraz', 'zil', 'mercedes-benz', 'scania', 'volvo', 'belaz'],
        groups: FIXED_PRODUCT_GROUPS_KUZOV, // FIXED AND DELETED
      },
      {
        labels: ['ford', 'howo', 'shaanxi', 'toyota'],
        groups: [
          {
            from: ['khodovaya_chast', 'gusenitsi_i_katki_opornie'], // FIXED
            to: ['khodovaya_chast', 'kolesa_i_stupitsi'],
          },
        ],
      },
    ],
  },
  {
    label: 'kommercheskii',
    autoBrands: [
      {
        labels: ['gaz', 'mercedes-benz'],
        groups: FIXED_PRODUCT_GROUPS_KUZOV, // FIXED AND DELETED
      },
    ],
  },
  {
    label: 'avtobusy',
    autoBrands: [
      {
        labels: ['amaz', 'ikarus', 'laz', 'liaz', 'nefaz', 'paz', 'hyundai', 'kia'],
        groups: FIXED_PRODUCT_GROUPS_KUZOV, // FIXED AND DELETED
      },
    ],
  },
  {
    label: 'spectehnika',
    autoBrands: [
      {
        labels: ['komatsu', 'shantui', 'atz', 'vgtz', 'ttm', 'chtz'],
        groups: [
          {
            from: ['khodovaya_chast', 'gusenitsi_i_katki'], // FIXED AND DELETED
            to: ['khodovaya_chast', 'gusenitsi_i_katki_opornie'],
          },
        ],
      },
      {
        labels: ['komatsu', 'shantui'],
        groups: [
          {
            from: ['rti'], // DELETED
          },
        ],
      },
      {
        labels: ['shantui', 'volvo', 'atz', 'amkodor', 'vgtz', 'lza', 'mtz', 'ptz', 'chtz', 'yumz'],
        groups: FIXED_PRODUCT_GROUPS_KUZOV, // FIXED AND DELETED
      },

      {
        labels: ['atz'],
        groups: [
          {
            from: ['rama'],
            to: ['khodovaya_chast', 'rama'], // OK
          },
        ],
      },
      {
        labels: ['vtz'],
        groups: [
          {
            from: ['prinadlezhnosti', 'kabina_traktora'], // FIXED AND DELETED
            to: ['kuzov', 'kabina_traktora'],
          },
        ],
      },
      {
        labels: ['khtz'],
        groups: [
          {
            from: ['prinadlezhnosti', 'kabina_traktora'], // FIXED AND DELETED
            to: ['kuzov', 'kabina_traktora'],
          },
          {
            from: ['prinadlezhnosti', 'mekhanizm_povorota_gusenits'], // OK
            to: ['mekhanizmi_upravleniya', 'mekhanizm_povorota_gusenits'],
          },
          {
            from: ['prinadlezhnosti', 'mekhanizm_povorota_i_bortovaya_peredacha'], // FIXED
            to: ['mekhanizmi_upravleniya', 'mekhanizm_povorota_i_bortovaya_peredacha'],
          },
          {
            from: ['khodovaya_chast', 'kolesa'], // FIXED AND DELETED
            to: ['khodovaya_chast', 'kolesa_i_stupitsi'],
          },
        ],
      },
      {
        labels: ['chtz'],
        groups: [
          {
            from: ['prinadlezhnosti', 'mekhanizm_povorota_i_bortovaya_peredacha'],
            to: ['mekhanizmi_upravleniya', 'mekhanizm_povorota_i_bortovaya_peredacha'],
          },
        ],
      },
    ],
  },
];
