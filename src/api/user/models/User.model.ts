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
  ForeignKey,
  BelongsTo,
  HasOne,
  BelongsToMany,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import FavoriteProduct from '../../catalog/models/FavoriteProduct.model';
import DeliveryAddress from '../../address/models/DeliveryAddress.model';
import Address from '../../address/models/Address.model';
import Requisites from './Requisites.model';
import JuristicSubject from './JuristicSubject.model';
import UserRoles from '../../role/models/UserRoles.model';
import Organization from '../../organization/models/Organization.model';
import ChatMember from '../../messenger/models/ChatMember.model';
import ChatMessage from '../../messenger/models/ChatMessage.model';
import ChatMessageView from '../../messenger/models/ChatMessageView.model';
import OrganizationBranch from '../../organization/models/OrganizationBranch.model';
import CustomerRegisterFile from '../../files/models/CustomerRegisterFile.model';
import SellerRegisterFile from '../../files/models/SellerRegisterFile.model';
import OrganizationSeller from '../../organization/models/OrganizationSeller.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import Order from '../../order/models/Order.model';
import SellerTransportCompany from './SellerTransportCompany.model';
import UserReview from './UserReview.model';
import SellerAutoBrands from '../../catalog/models/relations/SellerAutoBrands.model';
import CartProduct from '../../cart/models/CartProduct.model';
import ReasonToRejectShippingCondition from '../../order/models/reasonToRejectShippingCondition.model';
import TransportCompany from '../../shipping/models/TransportCompany';
import SellerUpdateApplication from './SellerUpdateApplication.model';
import OrganizationUpdateApplication from '../../organization/models/OrganizationUpdateApplication.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import SellerProductGroups from '../../catalog/models/relations/SellerProductGroups.model';
import Notification from '../../notification/models/Notification.model';
import OrderRequestSellerData from '../../order/models/OrderRequestSellerData.model';
import FileModel from '../../files/models/File.model';
import Chat from '../../messenger/models/Chat.model';
import Reward from '../../order/models/Reward.model';
import ProductBranch from '../../catalog/models/ProductBranch.model';
import DeviceToken from './DeviceToken.model';
import CustomerContract from './CustomerContract.model';
import JuristicSubjectCustomer from './JuristicSubjectCustomer.model';
import { PostponedPayment } from '../../order/models/PostponedPayment.model';

export const USER_SCOPES = {
  BASIC: 'basic',
};

@Table({
  tableName: 'User',
  scopes: {
    [USER_SCOPES.BASIC]: {
      attributes: ['id', 'idInt', 'phone', 'email'],
    },
  },
})
class User extends Model {
  @IsUUID(4)
  @PrimaryKey
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
  phone: string;

  @Default(false)
  @AllowNull(false)
  @Column
  phoneIsHidden: boolean;

  @AllowNull(true)
  @Column
  email: string;

  @AllowNull(true)
  @Column
  firstname: string;

  @AllowNull(true)
  @Column
  lastname: string;

  @AllowNull(true)
  @Column
  middlename: string;

  @AllowNull(true)
  @Column
  bannedUntil: Date;

  @AllowNull(true)
  @Column
  avatar: string;

  @AllowNull(true)
  @Column
  phoneVerificationDate: Date;

  @AllowNull(true)
  @Column
  emailVerificationDate: Date;

  @AllowNull(true)
  @Column(DataTypes.STRING)
  emailNotification: string;

  @Default(false)
  @AllowNull(true)
  @Column(DataTypes.BOOLEAN)
  isAgreeEmailNotification: boolean;

  @Default(null)
  @Column(DataTypes.FLOAT)
  ratingValue: number;

  @AllowNull(true)
  @Column
  minusRating: number;

  // Registration address of an individual
  @ForeignKey(() => Address)
  @AllowNull(true)
  @Column
  addressId: string;
  @BelongsTo(() => Address, 'addressId')
  address?: Address;

  @AllowNull(true)
  @Column
  sellerConfirmationDate: Date;

  @AllowNull(true)
  @Column
  salesNumber: number;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  savedSellerIds: string;

  @AllowNull(true)
  @Column
  sellerOfferDocName: string;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  sellerOfferDocDate: Date;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  sellerAutoBrandsJson: string;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  sellerProductGroupsJson: string;

  @AllowNull(true)
  @Column
  authCode: string;

  @AllowNull(true)
  @Column
  deletionAt: Date;

  @AllowNull(true)
  @Column
  sellerRegisterOrganizationId: string;

  @AllowNull(true)
  @Column
  sellerRegisterOrganizationBranchId: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isSpecialClient: boolean;

  @AllowNull(false)
  @Default(false)
  @Column
  postponedPaymentAllowed: boolean;

  @HasMany(() => UserReview, 'receiverId')
  reviews: UserReview[];

  @HasMany(() => UserRoles, 'userId')
  roles: UserRoles[];

  @HasMany(() => UserRoles, 'userId')
  requiredRoles: UserRoles[];

  @HasMany(() => OrderRequest, 'customerId')
  orderRequests: OrderRequest[];

  @HasMany(() => OrderRequestSellerData, { onDelete: 'CASCADE', hooks: true, foreignKey: 'sellerId' })
  orderRequestsSellerData: OrderRequestSellerData[];

  @HasMany(() => Order, 'sellerId')
  orders: Order[];

  @BelongsToMany(() => TransportCompany, () => SellerTransportCompany, 'sellerId', 'transportCompanyId')
  transportCompanies: TransportCompany[];

  // Additional requisites for user as individual
  @HasOne(() => Requisites, 'userId')
  requisites: Requisites;

  // For a customer
  // Addresses to deliver products from orders to
  @HasMany(() => DeliveryAddress, 'userId')
  deliveryAddresses: DeliveryAddress[];

  // For customers and sellers
  @HasMany(() => FavoriteProduct, 'userId')
  favoriteProducts: FavoriteProduct[];

  // For customers
  @HasMany(() => CartProduct, 'userId')
  cartProducts: CartProduct[];

  // For a customer
  @BelongsToMany(() => JuristicSubject, () => JuristicSubjectCustomer, 'userId', 'juristicSubjectId')
  juristicSubjects: JuristicSubject[];

  // Organizations created by user as seller
  @HasMany(() => Organization, 'creatorUserId')
  createdOrganizations: Organization[];

  // Organization branches created by user as seller
  @HasMany(() => OrganizationBranch, 'creatorUserId')
  createdOrganizationBranches: OrganizationBranch[];

  // @BelongsToMany(() => Organization, () => OrganizationSeller)
  // organizations: Organization[];

  // User as seller in organization those user registered in
  @HasMany(() => OrganizationSeller, 'userId')
  sellers: OrganizationSeller[];

  @HasMany(() => Chat, 'authorId')
  chats: Chat[];

  @HasMany(() => ChatMember, 'userId')
  chatMembers: ChatMember[];

  @HasMany(() => ChatMessage, 'authorId')
  chatMessages: ChatMessage[];

  @HasOne(() => ReasonToRejectShippingCondition, 'userId')
  reasonToRejectShippingCondition: ReasonToRejectShippingCondition;

  @HasMany(() => ChatMessageView, 'userId')
  chatMessageViews: ChatMessageView[];

  @HasMany(() => CustomerRegisterFile, 'userId')
  customerRegisterFiles: CustomerRegisterFile[];

  @HasMany(() => SellerRegisterFile, 'userId')
  sellerRegisterFiles: SellerRegisterFile[];

  @HasMany(() => SellerAutoBrands, 'userId')
  sellerAutoBrands: SellerAutoBrands[];

  @BelongsToMany(() => ProductGroup, () => SellerProductGroups, 'userId', 'productGroupId')
  sellerProductGroups: ProductGroup[];

  @HasOne(() => SellerUpdateApplication, 'userId')
  sellerUpdateApplication: SellerUpdateApplication;

  @HasMany(() => OrganizationUpdateApplication, 'userId')
  organizationUpdateApplications: OrganizationUpdateApplication[];

  @HasMany(() => Notification, 'userId')
  receivedNotifications: Notification[];

  @HasMany(() => Notification, 'aboutUserId')
  notifications: Notification[];

  @HasMany(() => Notification, 'aboutUserId')
  unreadNotifications: Notification[];

  @HasMany(() => FileModel, 'userId')
  files: FileModel[];

  @HasMany(() => Reward, 'sellerId')
  rewards: Reward[];

  @HasMany(() => SellerTransportCompany, 'sellerId')
  sellerTransportCompanies: SellerTransportCompany[];

  @HasMany(() => ProductBranch, 'userId')
  productBranches: ProductBranch[];

  @HasMany(() => DeviceToken, 'userId')
  deviceTokens: DeviceToken[];

  @HasMany(() => CustomerContract, 'customerId')
  linkedCustomerContracts: CustomerContract[];

  @HasMany(() => CustomerContract, 'creatorUserId')
  createdCustomerContracts: CustomerContract[];

  @HasMany(() => PostponedPayment)
  postponedPayments: PostponedPayment[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  public isServiceSeller?: boolean;
  public customerContracts?: CustomerContract[];
  public reviewsNumber?: number;
}

export default User;
