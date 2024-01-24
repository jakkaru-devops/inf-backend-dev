import axios, { AxiosResponse } from 'axios';
import { CLIENT_APP_URL, SBERPAY_PASSWORD, SBERPAY_SERVER, SBERPAY_USERNAME } from '../../../config/env';
import { calculateNds, gaussRound } from '../../../utils/common.utils';
import { getOrgName } from '../../organization/utils';
import User from '../../user/models/User.model';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';

interface IProps {
  order: OrderRequest;
  customer: User;
  totalPrice: number;
  selectedOffers: Order[];
  selectedProducts: RequestProduct[];
}

export const generatePaymentLinkService = async ({
  order,
  customer,
  totalPrice,
  selectedOffers,
  selectedProducts,
}: IProps) => {
  try {
    const data = {
      userName: SBERPAY_USERNAME, // required
      password: SBERPAY_PASSWORD, // required
      orderNumber: order.idOrder, // required
      amount: totalPrice * 100, // required
      // additionalOfdParams: {
      //   agent_info: {
      //     type: 1,
      //     MTOperator: ['+73952717700'], // Service contact phone
      //     supplier_info: {
      //       phones: selectedOffers.flatMap(offer => offer.organization.phone),
      //     },
      //   },
      // }, // required
      jsonParams: JSON.stringify({
        email: customer.email,
        phone: customer.phone,
      }),
      orderBundle: JSON.stringify({
        customerDetails: {
          email: customer.email,
          phone: customer.phone,
        },
        cartItems: {
          items: selectedProducts.map((product, i) => {
            const offer = selectedOffers.find(el => el.id === product.orderId);
            return {
              positionId: i + 1,
              name: product?.altName || product?.product?.name_ru,
              quantity: {
                value: product.count.toString() + '.00',
                measure: 'шт.',
              },
              itemAmount: gaussRound(product.unitPrice * product.count, 2) * 100,
              itemCode: product.productId,
              itemPrice: gaussRound(product.unitPrice, 2) * 100,
              tax: {
                taxType: !!offer.organization.hasNds ? '6' : '0',
                taxSum: !!offer.organization.hasNds
                  ? Math.round(gaussRound(calculateNds((product.count || 1) * product.unitPrice), 2) * 100)
                  : 0,
              },
              itemAttributes: {
                attributes: [
                  {
                    name: 'paymentMethod',
                    value: '1',
                  },
                  {
                    name: 'paymentObject',
                    value: '1',
                  },
                  { name: 'agent_info.type', value: '7' },
                  { name: 'agent_info.paying.operation', value: 'test operation' },
                  { name: 'agent_info.paying.phones', value: '+73952717700' },
                  { name: 'agent_info.paymentsOperator.phones', value: '+73952717700' },
                  { name: 'agent_info.MTOperator.phones', value: '+73952717700' },
                  { name: 'agent_info.MTOperator.name', value: 'MT operator' },
                  { name: 'agent_info.MTOperator.address', value: 'Иркутск' },
                  { name: 'agent_info.MTOperator.inn', value: '3801147025' },
                  // {
                  //   name: 'agent_info.type',
                  //   value: 1,
                  // },
                  // {
                  //   name: 'agent_info.MTOperator.phones',
                  //   value: '+73952717700',
                  // },
                  {
                    name: 'supplier_info.phones',
                    value: offer.organization.phone,
                  },
                  {
                    name: 'supplier_info.name',
                    value: getOrgName(offer.organization, true, true),
                  },
                  {
                    name: 'supplier_info.inn',
                    value: offer.organization.inn,
                  },
                ],
              },
            };
          }),
        },
      }), // required
      currency: 643, // RUB
      returnUrl: `${CLIENT_APP_URL}/orders/${order.id}`,
      failUrl: `${CLIENT_APP_URL}/requests/${order.id}/offers`,
      language: 'RU',
      clientId: customer.idInt,
      sessionTimeoutSecs: 7776000,
      email: customer.email,
      phone: customer.phone,
    };

    console.log('DATA', data);

    let response: AxiosResponse<any> = null;
    try {
      response = await axios.post(SBERPAY_SERVER + `/register.do`, null, {
        params: data,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
    } catch (err) {
      console.error('PAYMENT LINK ERROR', err);
      throw new ServiceError({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ссылка для оплаты не сформирована',
      });
    }

    console.log('PAYMENT RESPONSE', response);

    const resData: {
      orderId: string;
      formUrl: string;
    } = response.data;

    if (!resData?.orderId || !resData?.formUrl)
      throw new ServiceError({
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ссылка для оплаты не сформирована',
      });

    return {
      paymentId: resData.orderId,
      paymentLink: resData.formUrl,
    };
  } catch (err) {
    throw new ServiceError({
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Ссылка для оплаты не сформирована',
    });
  }
};
