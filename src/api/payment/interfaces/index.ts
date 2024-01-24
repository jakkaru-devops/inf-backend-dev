export interface IReceipt {
  receiptDate: string;
  orderNumber: string;
  calculationService: string;
  avtomat: string;
  customerEmail: string;
  inn: string;
  //PSB
  receiptNumber: string;
  turnNumber: string;
  fnsSite: string;
  RnKkt: string;
  fn: string;
  fd: string;
  fp: string;
  total: string;
  totalReceived: string;
  totalNds: string;
  orders: Array<{
    supplier: string;
    supplierInn: string;
    products: Array<{
      name: string;
      article: string;
      additionalArticle?: string;
      brand: string;
      prepayment: string;
      price: string;
      count: number;
      ndsFormat: 'НДС 20%, руб.:' | 'Товар без НДС';
      nds: string;
    }>;
  }>;
}

export interface ICheckOnlineResponse {
  ClientId: string;
  Date: {
    Date: { Day: number; Month: number; Year: number };
    Time: { Hour: number; Minute: number; Second: number };
  };
  Device: {
    Name: string;
    Address: string;
  };
  DeviceRegistrationNumber: string;
  DeviceSerialNumber: string;
  DocNumber: number;
  DocumentType: number;
  FNSerialNumber: string;
  FiscalDocNumber: number;
  FiscalSign: number;
  GrandTotal: number;
  MarkingInfo: object;
  Path: string;
  QR: string;
  RequestId: string;
  Response: {
    Error: number;
  };
  Responses: Array<{ Path: string; Response: object[] }>;
  Text: string;
  TurnNumber: number;
}

export interface CBIAdditionalUserProps {
  name: string;
  value: string;
}

export interface AgentInfo {
  type: number;
  transfer_operator_phone: string[];
  transfer_operator_name: string;
  transfer_operator_address: string;
  transfer_operator_inn: string;
  payment_operator_operation: string;
  payment_operator_phone: string[];
  receive_operator_phone: string[];
  supplier_phone: string[];
}

export interface AgentInfo2 {
  type: number;
  transfer_operator_phone: string[];
  transfer_operator_name: string;
  transfer_operator_address: string;
  transfer_operator_inn: string;
  payment_operator_operation: string;
  payment_operator_phone: string[];
  receive_operator_phone: string[];
  supplier_phone: string[];
  supplier_name: string;
  supplier_inn: string;
}

export interface Good {
  name: string;
  price: number;
  count: number;
  sum: number;
  payment_mode: number;
  item_type: number;
  nds_value: number;
  nds_not_apply: boolean;
  user_data: string;
  nomenclature_code: string;
  agent_info: AgentInfo2;
}

export interface Command {
  c_num: string;
  author: string;
  smsEmail54FZ: string;
  client_name: string;
  client_inn: string;
  additional_user_props: CBIAdditionalUserProps;
  agent_info: AgentInfo;
  goods: Good[];
  payed_cash: number;
  payed_cashless: number;
  payed_prepay: number;
  payed_credit: number;
  payed_consideration: number;
  tag1055: number;
}

export interface CBIReceiptInterface {
  id: number;
  shift_ref: number;
  user_ref: number;
  c_num: string;
  author: string;
  date_create: string;
  date_update: string;
  check_type_id: number;
  fn_number: string;
  ecr_registration_number: string;
  fiscal_document_number: string;
  fiscal_document_attribute: number;
  result_shift_number?: any;
  external_id: number;
  atol_id: string;
  receipt_datetime: Date;
  result_msg: string;
  payment_mode_check: string;
  client_name: string;
  status: number;
  result: number;
  total: number;
  command_type_id: number;
  date_result: string;
  atol_callback_url: string;
  atol_callback_status: number;
  full_payment_command: number;
  refund_command: number;
  type: string;
  receipt_url: string;
  command: Command;
}
export interface ShiftInfo {
  id: number;
  user_ref: number;
  date_start: string;
  date_stop: string;
  author: string;
  date_create: string;
  date_update: string;
  num: string;
  checks_count: number;
  income: number;
  income_checks_count: number;
  income_refund: number;
  is_open: boolean;
  avg: number;
}
