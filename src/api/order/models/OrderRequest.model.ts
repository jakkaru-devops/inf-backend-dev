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
  AutoIncrement,
  BelongsTo,
  ForeignKey,
  HasOne,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Order from './Order.model';
import RequestProduct from './RequestProduct.model';
import Address from '../../address/models/Address.model';
import OrderRequestFile from './OrderRequestFile.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import SelectedSettlements from '../../regions/models/SelectedSettlements.model';
import SelectedRegions from '../../regions/models/SelectedRegions.model';
import Notification from '../../notification/models/Notification.model';
import PaymentRefundRequest from './PaymentRefundRequest.model';
import OrderRequestSellerData from './OrderRequestSellerData.model';
import ChatMessage from '../../messenger/models/ChatMessage.model';

@Table({
  tableName: 'OrderRequest',
})
class OrderRequest extends Model<OrderRequest> {
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

  @AllowNull(false)
  @Unique
  @Column
  idOrder: string;

  @AllowNull(true)
  @Column(DataTypes.DOUBLE)
  totalPrice: number;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  comment: string;

  @Default('REQUESTED')
  @Column(DataTypes.ENUM('REQUESTED', 'APPROVED', 'PAID', 'PAYMENT_POSTPONED', 'DECLINED', 'COMPLETED'))
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'PAYMENT_POSTPONED' | 'DECLINED' | 'COMPLETED';

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  selectedSellerIds: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  customerId: string;
  @BelongsTo(() => User, 'customerId')
  customer?: User;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  paymentPostponedAt?: Date;

  @AllowNull(true)
  @Column
  paymentPostponeAcceptedAt?: Date;

  @AllowNull(true)
  @Column(DataTypes.ENUM('card', 'invoice'))
  paymentType: 'card' | 'invoice';

  @AllowNull(true)
  @Column
  paymentId: string;

  @AllowNull(true)
  @Column
  paymentLink: string;

  @ForeignKey(() => JuristicSubject)
  @AllowNull(true)
  @Column
  payerId: string;
  @BelongsTo(() => JuristicSubject, 'payerId')
  payer?: JuristicSubject;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  invoiceSellerIds: string;

  @AllowNull(true)
  @Column
  paidSum: number;

  @AllowNull(true)
  @Column
  paymentDate: Date;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  unpaidSellerIds: string;

  @AllowNull(true)
  @Column
  completionDate: Date;

  @AllowNull(true)
  @Default(false)
  @Column
  hasActiveRefundExchangeRequest: boolean;

  @AllowNull(false)
  @Default('[]')
  @Column(DataTypes.TEXT)
  productIds: string;

  @AllowNull(false)
  @Column
  customerLastNotificationCreatedAt: Date;

  @AllowNull(false)
  @Column
  managerLastNotificationCreatedAt: Date;

  @AllowNull(false)
  /* @Column(
    DataTypes.ENUM(
      'REQUESTED',
      'OFFER_RECEIVED',
      'OFFER_EXPIRED',
      'OFFER_UPDATE_REQUESTED',
      'OFFER_UPDATED',
      'APPROVED',
      'PAID',
      'SHIPPED',
      'DECLINED',
      'COMPLETED',
    ),
  ) */
  @Column
  customerStatus: string;

  @AllowNull(false)
  /* @Column(
    DataTypes.ENUM(
      'REQUESTED',
      'ORDER_REQUEST_BY_PHOTO_OR_DESCRIPTION',
      'OFFER_RECEIVED',
      'OFFER_EXPIRED',
      'OFFER_UPDATE_REQUESTED',
      'OFFER_UPDATED',
      'APPROVED',
      'PAID',
      'SHIPPED',
      'DECLINED',
      'REWARD_PAID',
      'COMPLETED',
    ),
  ) */
  @Column
  managerStatus: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  cancelPaymentMessage: string;

  @AllowNull(true)
  @Column
  deletedManagerId?: string;

  @AllowNull(true)
  @Column
  managerDeletedAt?: Date;

  //поставщик + заказы
  @HasMany(() => Order, { onDelete: 'CASCADE', hooks: true, foreignKey: 'orderRequestId' })
  orders: Order[];

  @HasMany(() => OrderRequestSellerData, { onDelete: 'CASCADE', hooks: true, foreignKey: 'orderRequestId' })
  sellersData: OrderRequestSellerData[];

  @HasMany(() => RequestProduct, { onDelete: 'CASCADE', hooks: true, foreignKey: 'orderRequestId' })
  products: RequestProduct[];

  @HasMany(() => Notification, 'orderRequestId')
  notifications: Notification[];

  @HasMany(() => Notification, 'orderRequestId')
  unreadNotifications: Notification[];

  @ForeignKey(() => Address)
  @AllowNull(true)
  @Column
  deliveryAddressId: string;
  @BelongsTo(() => Address, 'deliveryAddressId')
  address?: Address;

  @HasMany(() => OrderRequestFile, 'orderRequestId')
  orderRequestFiles: OrderRequestFile[];

  @HasMany(() => SelectedRegions, 'orderRequestId')
  selectedRegions: SelectedRegions[];

  @HasMany(() => SelectedRegions, 'orderRequestId')
  requiredSelectedRegions: SelectedRegions[];

  @HasMany(() => SelectedSettlements, 'orderRequestId')
  selectedSettlements: SelectedSettlements[];

  @HasMany(() => SelectedSettlements, 'orderRequestId')
  requiredSelectedSettlements: SelectedSettlements[];

  @HasOne(() => PaymentRefundRequest, { onDelete: 'CASCADE', hooks: true, foreignKey: 'orderRequestId' })
  paymentRefundRequest: PaymentRefundRequest;

  @HasMany(() => ChatMessage, 'orderRequestId')
  orderRequests: ChatMessage[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  isRequest?: boolean;
  isOrder?: boolean;
  categories?: string[];
}

export default OrderRequest;
