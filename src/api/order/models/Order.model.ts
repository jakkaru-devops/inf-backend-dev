import {
  Table,
  Unique,
  Column,
  PrimaryKey,
  IsUUID,
  AllowNull,
  Default,
  CreatedAt,
  UpdatedAt,
  Model,
  HasMany,
  DeletedAt,
  HasOne,
  AutoIncrement,
  BelongsTo,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import OrderRequest from './OrderRequest.model';
import RequestProduct from './RequestProduct.model';
import Organization from '../../organization/models/Organization.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import Reward from './Reward.model';
import OrderRequestFile from './OrderRequestFile.model';
import Notification from '../../notification/models/Notification.model';
import RefundExchangeRequest from './RefundExchangeRequest.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import ReasonToRejectShippingCondition from './reasonToRejectShippingCondition.model';
import Address from '../../address/models/Address.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';

@Table({
  tableName: 'Order',
})
class Order extends Model<Order> {
  @IsUUID(4)
  @PrimaryKey
  @Unique
  @Default(DataTypes.UUIDV4)
  @Column
  id?: string;

  @Unique
  @AutoIncrement
  @Column
  idInt?: number;

  @AllowNull(true)
  @Column
  idOrder: string;

  @AllowNull(true)
  @Column({
    type: DataTypes.DOUBLE,
  })
  totalPrice: number;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  sellerId: string;
  @BelongsTo(() => User, 'sellerId')
  seller?: User;

  @ForeignKey(() => OrderRequest)
  @AllowNull(true)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest?: OrderRequest;

  @ForeignKey(() => Address)
  @AllowNull(false)
  @Column
  supplierAddressId: string;
  @BelongsTo(() => Address, 'supplierAddressId')
  supplierAddress?: Address;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  paymentPostponedAt?: Date;

  @AllowNull(true)
  @Column
  paymentPostponeAcceptedAt?: Date;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  paymentPostponeMaxSum: number;

  @AllowNull(true)
  @Column
  paymentPostponeOverMaxSumApproved: boolean;

  // TODO У ключа нет отношения в таблице JuristicSubject
  @ForeignKey(() => JuristicSubject)
  @AllowNull(true)
  @Column
  paymentPostponeCustomerOrganizationId: string;
  @BelongsTo(() => JuristicSubject)
  paymentPostponeCustomerOrganization: JuristicSubject;

  @HasMany(() => Notification, 'orderId')
  notifications: Notification[];

  @HasMany(() => Notification, 'orderId')
  unreadNotifications: Notification[];

  @ForeignKey(() => Organization)
  @AllowNull(true)
  @Column
  organizationId: string;
  //todo: поставщик
  @BelongsTo(() => Organization, 'organizationId')
  organization?: Organization;

  @ForeignKey(() => OrganizationSeller)
  @AllowNull(false)
  @Column
  organizationSellerId: string;
  @BelongsTo(() => OrganizationSeller, 'organizationSellerId')
  organizationSeller: OrganizationSeller;

  @HasMany(() => RequestProduct, { onDelete: 'CASCADE', hooks: true, foreignKey: 'orderId' })
  products: RequestProduct[];

  @Default(false)
  @Column
  isPickup: boolean;

  @ForeignKey(() => TransportCompany)
  @AllowNull(true)
  @Column
  transportCompanyId: string;
  @BelongsTo(() => TransportCompany, 'transportCompanyId')
  transportCompany?: TransportCompany;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  invoiceGivenAt: Date;

  @ForeignKey(() => TransportCompany)
  @AllowNull(true)
  @Column
  notConfirmedTransportCompanyId: string;
  @BelongsTo(() => TransportCompany, 'notConfirmedTransportCompanyId')
  notConfirmedTransportCompany?: TransportCompany;

  @Default(false)
  @Column
  notConfirmedPickup: boolean;

  @AllowNull(true)
  @Column
  changedTransportCompany: boolean;

  @AllowNull(true)
  @Column
  trackNumber: string;

  // @AllowNull(true)
  // @Column
  // isSelected: boolean;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  departureDate: Date;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  receivingDate: Date;

  @AllowNull(true)
  @Column
  completionDate: Date;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  seenAt: Date;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  sellerUpdatedAt: Date;

  @AllowNull(true)
  @Column(DataTypes.DATE)
  offerExpiresAt: Date;

  @AllowNull(true)
  @Default(false)
  @Column
  hasActiveRefundExchangeRequest: boolean;

  @Default(false)
  @Column(DataTypes.BOOLEAN)
  isExpiredOffer: boolean;

  @Default(false)
  @Column(DataTypes.BOOLEAN)
  isRequestedToUpdateOffer: boolean;

  @AllowNull(false)
  @Column
  regionFiasId: string;

  @Default(false)
  @AllowNull(false)
  @Column
  isDeclined: boolean;

  @AllowNull(false)
  @Column(DataTypes.ENUM('OFFER', 'PAID', 'PAYMENT_POSTPONED'))
  status: 'OFFER' | 'PAID' | 'PAYMENT_POSTPONED';

  @AllowNull(true)
  @Column
  contractId?: string;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  paidSum: number;

  @AllowNull(true)
  @Column
  paidAt: Date;

  @AllowNull(true)
  @Column
  sellerLastNotificationCreatedAt: Date;

  @AllowNull(false)
  @Column
  sellerStatus: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  cancelPaymentMessage: string;

  /** Distance between customer and supplier */
  @AllowNull(true)
  @Column(DataTypes.FLOAT)
  distanceToSupplier: number;

  @HasOne(() => Reward, { onDelete: 'CASCADE', hooks: true, foreignKey: 'orderId' })
  reward?: Reward;

  @HasOne(() => ReasonToRejectShippingCondition, 'orderId')
  reasonToRejectShippingCondition: ReasonToRejectShippingCondition;

  @HasMany(() => OrderRequestFile, 'orderId')
  orderFiles?: OrderRequestFile[];

  @HasMany(() => RefundExchangeRequest, 'orderId')
  refundExchangeRequests?: RefundExchangeRequest[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  paymentPostponeAccepted?: boolean;
}

export default Order;
