import { Request, Response } from 'express';
import { Transaction } from 'sequelize';
import Order from '../models/Order.model';
import User from '../../user/models/User.model';
import OrderRequest from '../models/OrderRequest.model';
import RequestProduct from '../models/RequestProduct.model';
import Product from '../../catalog/models/Product.model';
import Organization from '../../organization/models/Organization.model';
import Address from '../../address/models/Address.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import CustomerContract from '../../user/models/CustomerContract.model';
import { DEFAULT_USER_LANGUAGE_LABEL, UPLOADS_DATE_FORMAT } from '../../../config/env';
import { calculateNds, convertAddressToString, getServerUrl, separateNumberBy } from '../../../utils/common.utils';
import numberToWordsRu from 'number-to-words-ru';
import formatDate from 'date-fns/format';
import CustomerContractSpecification from '../../user/models/CustomerContractSpecification.model';
import { getOrgName } from '../../organization/utils';
import FileModel from '../../files/models/File.model';
import { uploadPdf } from '../../../utils/pdf.utils';
import OrderRequestFile from '../models/OrderRequestFile.model';

interface IProps {
  orderRequestId: string;
  orderId: string;
  req: Request;
  res: Response;
  transaction: Transaction;
}

export const generateSpecificationService = async ({ orderRequestId, orderId, req, res, transaction }: IProps) => {
  let orderRequest = await OrderRequest.findByPk(orderRequestId, {
    include: [{ model: User, as: 'customer', required: true }],
    transaction,
  });
  const customer = orderRequest.customer;
  const order = await Order.findByPk(orderId, {
    include: [{ model: User, as: 'seller', required: true }],
    transaction,
  });

  const existingSpecification = await CustomerContractSpecification.findOne({
    where: {
      contractId: order.contractId,
      orderRequestId,
      orderId,
    },
    transaction,
  });
  if (!!existingSpecification) return new Promise(resolve => resolve(null));

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
  const juristicSubject = await JuristicSubject.findByPk(orderRequest.payerId, {
    include: [
      {
        model: Address,
        as: 'juristicAddress',
        required: true,
      },
    ],
    transaction,
  });
  const contract = await CustomerContract.findOne({
    where: {
      id: order.contractId,
      juristicSubjectId: juristicSubject.id,
    },
    transaction,
  });

  orderRequest = orderRequest.toJSON() as OrderRequest;

  const contractSpecifications = await CustomerContractSpecification.findAll({
    where: { contractId: contract.id },
    transaction,
  });
  const specificationNumber = (contractSpecifications.length + 1).toString();
  const specificationName = `Спецификация №${specificationNumber}`;

  const productsData = orderProducts
    .filter(({ isSelected }) => isSelected)
    .map((orderProduct, i) => ({
      index: i + 1,
      article: orderProduct?.altArticle || orderProduct.product.article,
      name: orderProduct?.altName || orderProduct.product[`name_${DEFAULT_USER_LANGUAGE_LABEL}`],
      manufacturer: orderProduct?.altManufacturer || orderProduct.product.manufacturer,
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

  const signer = contract.signerIsDirector
    ? {
        name: `${contract.directorFirstName[0]}.${
          !!contract?.directorMiddleName ? `${contract.directorMiddleName[0]}.` : ''
        } ${contract.directorLastName}`,
        post: 'Директор',
      }
    : {
        name: `${contract.signerFirstName[0]}.${
          !!contract?.signerMiddleName ? `${contract.signerMiddleName[0]}.` : ''
        } ${contract.signerLastName}`,
        post: contract.signerPost,
      };

  const data = {
    url: getServerUrl(req),
    date: formatDate(new Date(), 'dd.MM.yyyy'),
    specificationNumber: specificationNumber,
    contractNumber: contract.number,
    contractDate: formatDate(new Date(contract.date), 'dd.MM.yyyy'),
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
    directorName: `${contract.directorLastName} ${contract.directorFirstName}${
      !!contract?.directorMiddleName ? ` ${contract?.directorMiddleName}` : ''
    }`,
    directorPost: contract.directorPost,
    signer,
    totals,
    totalsInWords,
    productsData,
  };

  const nowDateStr = formatDate(new Date(), UPLOADS_DATE_FORMAT);
  const pdfName = `Заказ ${order?.idOrder || orderRequest?.idOrder} спецификация ${data.specificationNumber}.pdf`;

  const existingFile = await FileModel.findOne({
    where: {
      name: pdfName,
    },
    transaction,
  });
  if (!!existingFile) {
    await existingFile.destroy({ transaction });
  }

  const { file } = await uploadPdf({
    data,
    pathToTemplate: 'templates/specification.html',
    pathToPdfFolder: `unknown/${nowDateStr}/users/guest`,
    pdfName,
    group: 'specification',
    transaction,
  });

  await OrderRequestFile.create(
    {
      orderRequestId: orderRequest.id,
      orderId,
      fileId: file.id,
      group: 'specification',
    },
    { transaction },
  );
  await CustomerContractSpecification.create(
    {
      contractId: contract.id,
      orderRequestId,
      orderId,
      fileId: file.id,
      name: specificationName,
    },
    { transaction },
  );

  return new Promise(resolve => resolve(file));
};
