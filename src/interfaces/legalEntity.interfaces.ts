export interface IDaDataOrgSuggestion {
  value: string;
  unrestricted_value: string;
  data: {
    citizenship: any;
    kpp: string;
    capital: any;
    management?: {
      name: string;
      post: string;
      disqualified: boolean;
    };
    fio?: {
      name: string;
      surname: string;
      patronymic?: string;
    };
    founders: any;
    managers: any;
    predecessors: any;
    successors: any;
    branch_type: 'MAIN';
    branch_count: number;
    source: any;
    qc: any;
    hid: string;
    type: 'LEGAL' | 'INDIVIDUAL';
    state: {
      status: 'ACTIVE';
      code: any;
      actuality_date: number;
      registration_date: number;
      liquidation_date?: number;
    };
    opf: {
      type: string;
      code: string;
      full: string;
      short: string;
    };
    name: {
      full_with_opf: string;
      short_with_opf: string;
      latin: string;
      full: string;
      short: string;
    };
    inn: string;
    ogrn: string;
    okpo: string;
    okato: string;
    oktmo: string;
    okogu: string;
    okfs: string;
    okved: string;
    okveds: any;
    authorities: any;
    documents: any;
    licenses: any;
    finance: {
      tax_system: any;
      income: any;
      expense: any;
      debt: any;
      penalty: any;
      year: any;
    };
    address: {
      value: string;
      unrestricted_value: string;
      data: {
        postal_code: string;
        country: string;
        country_iso_code: string;
        federal_district: string;
        region_fias_id: string;
        region_kladr_id: string;
        region_iso_code: string;
        region_with_type: string;
        region_type: string;
        region_type_full: string;
        region: string;
        area_fias_id: any;
        area_kladr_id: any;
        area_with_type: any;
        area_type: any;
        area_type_full: any;
        area: any;
        city_fias_id: string;
        city_kladr_id: string;
        city_with_type: string;
        city_type: string;
        city_type_full: string;
        city: string;
        city_area: any;
        city_district_fias_id: any;
        city_district_kladr_id: any;
        city_district_with_type: string;
        city_district_type: string;
        city_district_type_full: string;
        city_district: string;
        settlement_fias_id: any;
        settlement_kladr_id: any;
        settlement_with_type: any;
        settlement_type: any;
        settlement_type_full: any;
        settlement: any;
        street_fias_id: string;
        street_kladr_id: string;
        street_with_type: string;
        street_type: string;
        street_type_full: string;
        street: string;
        house_fias_id: string;
        house_kladr_id: string;
        house_type: string;
        house_type_full: string;
        house: string;
        block_type: any;
        block_type_full: any;
        block: any;
        entrance: any;
        floor: any;
        flat_fias_id: any;
        flat_type: string;
        flat_type_full: string;
        flat: string;
        flat_area: any;
        square_meter_price: any;
        flat_price: any;
        postal_box: any;
        fias_id: string;
        fias_code: string;
        fias_level: string;
        fias_actuality_state: string;
        kladr_id: string;
        geoname_id: string;
        capital_marker: string;
        okato: string;
        oktmo: string;
        tax_office: string;
        tax_office_legal: string;
        timezone: string;
        geo_lat: string;
        geo_lon: string;
        beltway_hit: any;
        beltway_distance: any;
        metro: any;
        qc_geo: string;
        qc_complete: any;
        qc_house: any;
        history_values: any;
        unparsed_parts: any;
        source: string;
        qc: string;
      };
    };
    phones: any;
    emails: any;
    ogrn_date: number;
    okved_type: string;
    employee_count: any;
  };
}

export interface IDaDataOrgResponse {
  suggestions: IDaDataOrgSuggestion[];
}
