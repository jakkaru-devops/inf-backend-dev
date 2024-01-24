import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  DeletedAt,
  ForeignKey,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Unique,
  UpdatedAt,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import Role from '../../role/models/Role.model';
import Order from '../../order/models/Order.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import { ENotificationType } from '../interfaces';
import Organization from '../../organization/models/Organization.model';
import ProductOffer from '../../catalog/models/ProductOffer.model';
import Complaint from '../../user/models/Complaint.model';

@Table({
  tableName: 'Notifications',
})
class Notification extends Model<Notification> {
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

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @ForeignKey(() => Role)
  @AllowNull(true)
  @Column
  roleId: string;
  @BelongsTo(() => Role, 'roleId')
  role?: Role;

  @AllowNull(true)
  @Column(DataTypes.JSON)
  data: string;

  @AllowNull(false)
  @Column(DataType.ENUM(...Object.keys(ENotificationType)))
  type: ENotificationType;

  @AllowNull(false)
  @Column
  autoread: boolean;

  @ForeignKey(() => OrderRequest)
  @AllowNull(true)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest?: OrderRequest;

  @ForeignKey(() => Order)
  @AllowNull(true)
  @Column
  orderId: string;
  @BelongsTo(() => Order, 'orderId')
  order?: Order;

  @ForeignKey(() => Organization)
  @AllowNull(true)
  @Column
  organizationId: string;
  @BelongsTo(() => Organization, 'organizationId')
  organization: Organization;

  @ForeignKey(() => ProductOffer)
  @AllowNull(true)
  @Column
  productOfferId: string;
  @BelongsTo(() => ProductOffer, 'productOfferId')
  productOffer: ProductOffer;

  @ForeignKey(() => Complaint)
  @AllowNull(true)
  @Column
  userComplaintId: string;
  @BelongsTo(() => Complaint, 'userComplaintId')
  userComplaint: Complaint;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  aboutUserId: string;
  @BelongsTo(() => User, 'aboutUserId')
  aboutUser: User;

  @ForeignKey(() => Role)
  @AllowNull(true)
  @Column
  aboutUserRoleId: string;
  @BelongsTo(() => Role, 'aboutUserRoleId')
  aboutUserRole: Role;

  @AllowNull(true)
  @Column
  viewedAt: Date;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Notification;
