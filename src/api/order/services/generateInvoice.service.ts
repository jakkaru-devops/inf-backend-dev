import { Request } from 'express';
import { Transaction } from 'sequelize';
import User from '../../user/models/User.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import Order from '../models/Order.model';
import { DEFAULT_USER_LANGUAGE_LABEL, ENV, UPLOADS_DATE_FORMAT } from '../../../config/env';
import OrderRequest from '../models/OrderRequest.model';
import { uploadPdf } from '../../../utils/pdf.utils';
import FileModel from '../../files/models/File.model';
import Organization from '../../organization/models/Organization.model';
import OrderRequestFile from '../models/OrderRequestFile.model';
import { getOrgName } from '../../organization/utils';
import Address from '../../address/models/Address.model';
import RequestProduct from '../models/RequestProduct.model';
import Product from '../../catalog/models/Product.model';
import formatDate from 'date-fns/format';
import { calculateNds, convertAddressToString, getServerUrl, separateNumberBy } from '../../../utils/common.utils';
import numberToWordsRu from 'number-to-words-ru';
import { SERVICE_ORGANIZATION_INN } from '../../organization/data';
import CustomerContract from '../../user/models/CustomerContract.model';

interface IProps {
  orderId: string;
  juristicSubjectId: string;
  contractId: CustomerContract['id'];
  req: Request;
  transaction: Transaction;
}

export const generateOrderInvoiceService = async ({
  orderId,
  juristicSubjectId,
  contractId,
  req,
  transaction,
}: IProps): Promise<FileModel> => {
  const order = await Order.findByPk(orderId, {
    include: [
      { model: User, as: 'seller', required: true },
      {
        model: OrderRequest,
        as: 'orderRequest',
        required: true,
        include: [{ model: User, as: 'customer', required: true }],
      },
    ],
    transaction,
  });
  const orderProducts = await RequestProduct.findAll({
    where: {
      orderId: order.id,
      isSelected: true,
    },
    include: [{ model: Product, as: 'product', required: true }],
    transaction,
  });
  const organization = await Organization.findOne({
    where: {
      id: order.organizationId,
    },
    include: [
      {
        model: Address,
        as: 'juristicAddress',
        required: true,
      },
    ],
    transaction,
  });
  const juristicSubject = await JuristicSubject.findByPk(juristicSubjectId, {
    include: [
      {
        model: Address,
        as: 'juristicAddress',
        required: true,
      },
    ],
    transaction,
  });

  const orderRequest = order.orderRequest.toJSON() as OrderRequest;
  const customer = orderRequest.customer as User;
  const isSpecialInvoice = organization.inn === SERVICE_ORGANIZATION_INN && juristicSubject.isSpecialClient;

  const contract = isSpecialInvoice
    ? await CustomerContract.findOne({
        where: {
          id: contractId,
          juristicSubjectId: juristicSubject.id,
        },
        transaction,
      })
    : null;

  const productsData = orderProducts
    .filter(({ isSelected }) => isSelected)
    .map((orderProduct, i) => ({
      index: i + 1,
      article: orderProduct?.altArticle || orderProduct?.product?.article || orderProduct?.reserveArticle,
      name:
        orderProduct?.altName ||
        orderProduct?.product?.[`name_${DEFAULT_USER_LANGUAGE_LABEL}`] ||
        orderProduct?.reserveName,
      manufacturer:
        orderProduct?.altManufacturer || orderProduct?.product?.manufacturer || orderProduct?.reserveManufacturer,
      count: orderProduct.count,
      unitPrice: separateNumberBy(orderProduct.unitPrice.toFixed(2), ' ').replace('.', ','),
      totalPrice: separateNumberBy((orderProduct.unitPrice * orderProduct.count).toFixed(2), ' ').replace('.', ','),
    }))
    .sort((a, b) => a.index - b.index);

  const nds = organization.hasNds ? calculateNds(order.totalPrice) : null;
  const totals = {
    sum: separateNumberBy(order.totalPrice.toFixed(2), ' ').replace('.', ','),
    nds: !!nds ? separateNumberBy(nds.toFixed(2), ' ').replace('.', ',') : null,
    productNamesCount: orderProducts.length,
    productsCount: orderProducts.map(({ count }) => count).reduce((a, b) => a + b, 0),
  };
  const totalsInWords = {
    sum: numberToWordsRu.convert(totals.sum),
    nds: !!nds ? numberToWordsRu.convert(totals.nds) : null,
  };
  const displayAgent = organization.inn !== SERVICE_ORGANIZATION_INN;
  const data = {
    url: getServerUrl(req),
    idOrder: orderRequest.idOrder,
    invoiceNumber: order.idOrder,
    paymentPostponedAt: order.paymentPostponedAt && formatDate(new Date(order.paymentPostponedAt), 'dd.MM.yyyy'),
    date: formatDate(new Date(), 'dd.MM.yyyy'),
    sellerOrg: {
      name: getOrgName(organization, true, true),
      email: organization.email,
      phone: organization.phone,
      inn: organization.inn,
      kpp: organization.kpp,
      ogrnForm: organization.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
      ogrn: organization.ogrn,
      address: convertAddressToString(organization.juristicAddress),
    },
    customerOrg: {
      name: getOrgName(juristicSubject, true, true),
      email: juristicSubject?.email || customer?.email || '-',
      inn: juristicSubject.inn,
      kpp: juristicSubject.kpp,
      ogrnForm: juristicSubject.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
      ogrn: juristicSubject.ogrn,
      address: convertAddressToString(juristicSubject.juristicAddress),
      phone: juristicSubject,
    },
    contract: !!contract
      ? {
          number: contract.number,
          date: formatDate(new Date(contract.date), 'dd.MM.yyyy'),
        }
      : null,
    totals,
    totalsInWords,
    productsData,
    displayAgent,
    signatureIndent: !displayAgent && productsData.length < 3 ? (3 - productsData.length) * 100 : null, // для подписи и печати добавляется отступ для переноса на следующую страницу чтобы картинка печати не разрывалась на 2 части между страницами
  };
  const nowDateStr = formatDate(new Date(), UPLOADS_DATE_FORMAT);
  const pdfName = `${getOrgName(organization, true, false)} ${data.invoiceNumber}.pdf`;

  const existingFile = await FileModel.findOne({
    where: {
      name: pdfName,
    },
    transaction,
  });
  if (!!existingFile) {
    await existingFile.destroy({ transaction });
  }

  const pathToTemplate = isSpecialInvoice ? 'templates/invoiceSpecial.html' : 'templates/invoice.html';

  const { file } = await uploadPdf({
    data,
    pathToTemplate,
    pathToPdfFolder: `unknown/${nowDateStr}/users/guest`,
    pdfName,
    group: 'invoice',
    transaction,
  });

  await OrderRequestFile.create(
    {
      orderRequestId: orderRequest.id,
      orderId,
      fileId: file.id,
      group: 'invoice',
    },
    { transaction },
  );

  return new Promise(resolve => resolve(file));
};
