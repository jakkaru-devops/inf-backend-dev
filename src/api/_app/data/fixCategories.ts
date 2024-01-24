interface IFixedProductGroupData {
  from: string[];
  to?: string[];
}

export const FIXED_PRODUCT_GROUPS: IFixedProductGroupData[] = [
  // Двигатель
  {
    from: ['dvigatel', 'sistema_vipuska'], // OK
    to: ['dvigatel', 'sistema_vipuska_gazov_dvigatelya'],
  },
  {
    from: ['dvigatel', 'sistema_vipuska_gazov'], // OK
    to: ['dvigatel', 'sistema_vipuska_gazov_dvigatelya'],
  },
  {
    from: ['dvigatel', 'sistema_pitaniya'], // OK
    to: ['dvigatel', 'sistema_pitaniya_dvigatelya'],
  },
  {
    from: ['dvigatel', 'sistema_okhlazhdeniya'], // FIXED AND DELETED
    to: ['dvigatel', 'sistema_okhlazhdeniya_dvigatelya'],
  },
  {
    from: ['dvigatel', 'sistema_smazki'], // OK
    to: ['dvigatel', 'sistema_smazki,_sistema_upravleniya_dvigatelem_elektronnaya'],
  },
  // Дополнительное оборудование
  {
    from: ['dopolnitelnoe_oborudovanie', 'otbor_moshchnosti'], // OK
    to: ['dopolnitelnoe_oborudovanie', 'korobka_otbora_moshchnosti'],
  },
  {
    from: ['dopolnitelnoe_oborudovanie', 'lebedka,_ustroistva_valochno-trelevochnoe'], // OK
    to: ['dopolnitelnoe_oborudovanie', 'lebedka,_ustroistvo_valochno-trelevochnoe'],
  },
  {
    from: ['dopolnitelnoe_oborudovanie', 'lebedka,_ustroistvo_vlochno-trelevochnoe'], // OK
    to: ['dopolnitelnoe_oborudovanie', 'lebedka,_ustroistvo_valochno-trelevochnoe'],
  },
  // Кузов (Кабина)
  /* {
    from: ['kabina', 'ventilyatsiya_i_otoplenie'],
    to: ['kuzov', 'otoplenie_i_ventilyatsiya_kabini'],
  },
  {
    from: ['kabina', 'dveri'],
    to: ['kuzov', 'dveri'],
  },
  {
    from: ['kabina', 'zerkala_i_stekla'],
    to: ['kuzov', 'prinadlezhnosti_kabini'],
  },
  {
    from: ['kabina', 'remni_bezopasnosti'],
    to: ['kuzov', 'prinadlezhnosti_kabini'],
  },
  {
    from: ['kabina', 'obshivka_kabini'],
    to: ['kuzov', 'obshivka_kabini'],
  },
  {
    from: ['kabina', 'stekloochistiteli'],
    to: ['kuzov', 'okno_vetrovoe_i_zadnee'],
  }, */
  // Кузов
  {
    from: ['kuzov', 'sistema_podyoma_i_opuska_platformi'], // OK
    to: ['kuzov', 'ustroistvo_podemnoe_i_oprokidivayushchee_platformi'],
  },
  {
    from: ['kuzov', 'ustroistvo_podema_platformi'], // OK
    to: ['kuzov', 'ustroistvo_podemnoe_i_oprokidivayushchee_platformi'],
  },
  {
    from: ['kuzov', 'ustroistvo_podyoma_i_opuskaniya_platformi'], // OK
    to: ['kuzov', 'ustroistvo_podemnoe_i_oprokidivayushchee_platformi'],
  },
  {
    from: ['kuzov', 'kapot,_krilya,_oblitsovka_radiatora'], // OK
    to: ['kuzov', 'kapot,_krilya,_oblitsovka_radiatora_(operenie)'],
  },
  {
    from: ['kuzov', 'ustroistvo_podemnoe_i_oprokidivayushchee_kabini'], // OK
    to: ['kuzov', 'ustroistvo_podemnoe_i_oprokidivayushchee_plaformi'],
  },
  {
    from: ['kuzov', 'elementi_opereniya'], // OK
    to: ['kuzov', 'kapot,_krilya,_oblitsovka_radiatora_(operenie)'],
  },
  {
    from: ['kuzov', 'kabina'], // OK
    to: ['kuzov', 'kabina_(kuzov)'],
  },
  // Электрооборудование
  {
    from: ['pribori_i_datchiki'], // OK
    to: ['elektrooborudovanie', 'pribori_i_datchiki'],
  },
  {
    from: ['elektrooborudovanie', 'generator'], // OK
    to: ['elektrooborudovanie', 'generatori'],
  },
  {
    from: ['elektrooborudovanie', 'pereklyuchateli'], // OK
    to: ['elektrooborudovanie', 'viklyuchateli,_pereklyuchateli,_knopki'],
  },
  // Ходовая часть
  /* {
    from: ['khodovaya_chast', 'gusenitsi_i_katki_opornie'],
    to: ['khodovaya_chast', 'kolesa_i_stupitsi'],
  }, */
  {
    from: ['khodovaya_chast', 'podveska'], // FIXED AND DELETED
    to: ['khodovaya_chast', 'podveska_avtomobilya'],
  },
  {
    from: ['khodovaya_chast', 'prodveska_avtomobilya'], // OK
    to: ['khodovaya_chast', 'podveska_avtomobilya'],
  },
  {
    from: ['khodovaya_chast', 'os_perednyaya'], // OK
    to: ['khodovaya_chast', 'podveska_avtomobilya'],
  },
  {
    from: ['khodovaya_chast', 'os_perednyaya_(zadnyaya_dlya_peredneprivodnikh)'], // OK
    to: ['khodovaya_chast', 'podveska_avtomobilya'],
  },
  {
    from: ['khodovaya_chast', 'sistema_podkachki_koles'], // OK
    to: ['khodovaya_chast', 'kolesa_i_stupitsi'],
  },
  {
    from: ['rama'], // OK
    to: ['khodovaya_chast', 'rama'],
  },
  // Механизмы управления
  {
    from: ['mekhanizm_upravleniya'], // OK
    to: ['mekhanizmi_upravleniya'],
  },
  // Трансмиссия
  {
    from: ['transmissiya', 'most_perednii'], // FIXED AND DELETED
    to: ['transmissiya', 'most_perednii_vedushchii'],
  },
  {
    from: ['transmissiya', 'kardannaya_peredacha'], // OK
    to: ['transmissiya', 'peredacha_kardannaya'],
  },
  {
    from: ['transmissiya', 'kardannaya_peredacha_transmissii'], // OK
    to: ['transmissiya', 'peredacha_kardannaya'],
  },
  {
    from: ['transmissiya', 'most_srednii'], // FIXED AND DELETED
    to: ['transmissiya', 'most_srednii_(promezhutochnii)'],
  },
  {
    from: ['transimissiya'], // OK
    to: ['transmissiya'],
  },
  // Принадлежности
  {
    from: ['prinadlezhnosti', 'instrument'], // OK
    to: ['prinadlezhnosti', 'instrument_shoferskoi_i_prinadlezhnosti'],
  },
  {
    from: ['prinadlezhnosti', 'instrument_shoferskii_i_prinadlezhnosti'], // OK
    to: ['prinadlezhnosti', 'instrument_shoferskoi_i_prinadlezhnosti'],
  },
  {
    from: ['prinadlezhnosti', 'mekhanizm_povorota_gusenits'], // DELETED
    to: ['mekhanizmi_upravleniya', 'mekhanizm_povorota_gusenits'],
  },
  // Фитинги
  {
    from: ['fiting'], // DELETED
    to: ['fitingi'],
  },
];

export const FIXED_PRODUCT_GROUPS_KUZOV: IFixedProductGroupData[] = [
  {
    from: ['kabina', 'ventilyatsiya_i_otoplenie'], // FIXED AND DELETED
    to: ['kuzov', 'otoplenie_i_ventilyatsiya_kabini'],
  },
  {
    from: ['kabina', 'dveri'], // FIXED (parentId CHANGED)
    to: ['kuzov', 'dveri'],
  },
  {
    from: ['kabina', 'zerkala_i_stekla'], // FIXED AND DELETED
    to: ['kuzov', 'prinadlezhnosti_kabini'],
  },
  {
    from: ['kabina', 'remni_bezopasnosti'],
    to: ['kuzov', 'prinadlezhnosti_kabini'],
  },
  {
    from: ['kabina', 'obshivka_kabini'], // FIXED (parentId CHANGED)
    to: ['kuzov', 'obshivka_kabini'],
  },
  {
    from: ['kabina', 'stekloochistiteli'], // FIXED AND DELETED
    to: ['kuzov', 'okno_vetrovoe_i_zadnee'],
  },
];
