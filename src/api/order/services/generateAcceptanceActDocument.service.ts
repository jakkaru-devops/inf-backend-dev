import { Transaction } from 'sequelize';
import Order from '../models/Order.model';
import OrderRequest from '../models/OrderRequest.model';
import { ServiceError } from '../../../core/utils/serviceError';
import httpStatus from 'http-status';
import RequestProduct from '../models/RequestProduct.model';
import Product from '../../catalog/models/Product.model';
import Organization from '../../organization/models/Organization.model';
import User from '../../user/models/User.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import formatDate from 'date-fns/format';
import { getOrgName } from '../../organization/utils';
import { calculateNds, convertAddressToString, getUserName, separateNumberBy } from '../../../utils/common.utils';
import Address from '../../address/models/Address.model';
import numberToWordsRu from 'number-to-words-ru';
import { uploadPdf } from '../../../utils/pdf.utils';
import { EXTERNAL_APP_URL } from '../../../config/env';
import OrderRequestFile from '../models/OrderRequestFile.model';
import { getFilePreviewUrl } from '../../catalog/utils';

interface IProps {
  orderId: OrderRequest['id'];
  offerId: Order['id'];
  products: Array<{
    id: RequestProduct['id'];
    quantity: number;
  }>;
}

export const generateAcceptanceActDocumentService = async (
  { orderId, offerId, products: productsData }: IProps,
  { transaction }: { transaction: Transaction },
) => {
  const order = await OrderRequest.findByPk(orderId, { transaction });
  if (!order) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Заказ не найден' });

  const offer = await Order.findByPk(offerId, { transaction });
  if (!offer) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Заказ не найден' });

  const offerProducts = await RequestProduct.findAll({
    where: {
      id: productsData.map(el => el.id),
      orderId: offer.id,
    },
    include: [{ model: Product, as: 'product', required: false }],
    transaction,
  });
  if (!offerProducts.length)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Не выбраны товары',
    });
  if (offerProducts.length !== productsData.length)
    throw new ServiceError({
      status: httpStatus.BAD_REQUEST,
      message: 'Не все выбранные товары присутствуют в заказе',
    });

  const organization = await Organization.findByPk(offer.organizationId, {
    include: [{ model: Address, as: 'juristicAddress', required: true }],
    transaction,
  });
  if (!organization)
    throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Организация-поставщик не найдена' });

  let customer: User;
  let customerOrg: JuristicSubject;
  const customerIsOrganization = !!order.payerId;

  if (customerIsOrganization) {
    customerOrg = await JuristicSubject.findByPk(order.payerId, {
      include: [{ model: Address, as: 'juristicAddress', required: true }],
      transaction,
    });
    if (!customerOrg)
      throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Организация-покупатель не найдена' });
  } else {
    customer = await User.findByPk(order.customerId, { transaction });
    if (!customer) throw new ServiceError({ status: httpStatus.NOT_FOUND, message: 'Покупатель не найден' });
  }

  const prevActsCount = await OrderRequestFile.count({
    where: {
      orderId: offer.id,
      group: 'acceptanceCertificate',
    },
    transaction,
  });

  const resultProducts: any[] = [];
  for (let i = 0; i < offerProducts.length; i++) {
    const offerProduct = offerProducts[i];
    const productData = productsData.find(el => el.id === offerProduct.id);
    if (!productData)
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: 'Не все выбранные товары присутствуют в заказе',
      });

    const productName = offerProduct?.altName || offerProduct?.product?.name_ru || offerProduct?.reserveName;
    const newTransferedQuantity = offerProduct.transferedQuantity + productData.quantity;

    if (
      !productData?.quantity ||
      productData.quantity > offerProduct.count ||
      newTransferedQuantity > offerProduct.count
    ) {
      throw new ServiceError({
        status: httpStatus.BAD_REQUEST,
        message: `Некорректное количество товара ${productName}`,
      });
    }

    await offerProduct.update(
      {
        transferedQuantity: newTransferedQuantity,
      },
      { transaction },
    );

    const totalPrice = productData.quantity * offerProduct.unitPrice;

    resultProducts.push({
      number: i + 1,
      name: productName,
      article: offerProduct?.altArticle || offerProduct?.product?.article || offerProduct?.reserveArticle,
      manufacturer:
        offerProduct?.altManufacturer || offerProduct?.product?.manufacturer || offerProduct?.reserveManufacturer,
      quantity: productData.quantity,
      unitPrice: separateNumberBy(offerProduct.unitPrice.toFixed(2), ' ').replace('.', ','),
      totalPriceNumber: totalPrice,
      totalPrice: separateNumberBy(totalPrice.toFixed(2), ' ').replace('.', ','),
    });
  }
  const orderNumber = offer?.idOrder || order.idOrder;
  const totalPrice = resultProducts.map(product => product.totalPriceNumber).reduce((a, b) => a + b, 0);
  const nds = organization.hasNds ? calculateNds(totalPrice) : null;
  const totals = {
    totalPrice: separateNumberBy(totalPrice.toFixed(2), ' ').replace('.', ','),
    nds: !!nds ? separateNumberBy(nds.toFixed(2), ' ').replace('.', ',') : null,
    productNamesCount: resultProducts.length,
    productsCount: resultProducts.map(product => product.quantity).reduce((a, b) => a + b, 0),
  };
  const totalsInWords = {
    totalPrice: numberToWordsRu.convert(totals.totalPrice),
    nds: !!nds ? numberToWordsRu.convert(totals.nds) : null,
  };

  const data = {
    url: EXTERNAL_APP_URL,
    orderNumber,
    date: formatDate(new Date(), 'dd.MM.yyyy'),
    invoiceNumber: orderNumber,
    invoiceDate: formatDate(new Date(offer?.invoiceGivenAt || order?.paymentDate), 'dd.MM.yyyy'),
    supplier: {
      name: getOrgName(organization, true, true),
      email: organization.email,
      phone: organization.phone,
      inn: organization.inn,
      kpp: organization.kpp,
      ogrnForm: organization.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
      ogrn: organization.ogrn,
      address: convertAddressToString(organization.juristicAddress),
    },
    customer: !!customer
      ? {
          name: getUserName(customer, 'full'),
        }
      : null,
    customerOrg: !!customerOrg
      ? {
          name: getOrgName(customerOrg, true, true),
          email: customerOrg.email,
          inn: customerOrg.inn,
          kpp: customerOrg.kpp,
          ogrnForm: customerOrg.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
          ogrn: customerOrg.ogrn,
          address: convertAddressToString(customerOrg.juristicAddress),
        }
      : null,
    products: resultProducts,
    totals,
    totalsInWords,
  };

  const docName = `АКТ приема-передачи ${orderNumber}${prevActsCount > 0 ? ` ${prevActsCount + 1}` : ''}`;

  const { file: fileEntity, pdf } = await uploadPdf({
    data,
    pathToTemplate: `templates/${
      customerIsOrganization ? 'acceptanceActOrganization' : 'acceptanceActIndividual'
    }.html`,
    pathToPdfFolder: `orders/${order.id}`,
    pdfName: `${docName}.pdf`,
    transaction,
  });

  const orderFile = await OrderRequestFile.create(
    {
      orderRequestId: order.id,
      orderId: offer.id,
      group: 'acceptanceCertificate',
      fileId: fileEntity.id,
    },
    { transaction },
  );

  const attachment = {
    id: orderFile.id,
    userId: fileEntity?.userId,
    orderId: orderFile.orderId,
    group: orderFile.group,
    name: fileEntity?.name,
    ext: fileEntity?.ext,
    url: getFilePreviewUrl(fileEntity),
  };

  return {
    attachment,
    orderFile,
    title: docName,
    file: pdf.toString('base64'),
  };
};
