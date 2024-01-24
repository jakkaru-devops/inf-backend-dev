import { DataTypes } from 'sequelize';
import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  Default,
  DeletedAt,
  ForeignKey,
  Min,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import User from '../../user/models/User.model';
import JuristicSubject from '../../user/models/JuristicSubject.model';
import Organization from '../../organization/models/Organization.model';
import Warehouse from '../../catalog/models/Warehouse.model';

@Table({
  tableName: 'PostponedPayment',
})
export class PostponedPayment extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  customerId: string;
  @BelongsTo(() => User)
  customer?: User;

  @ForeignKey(() => JuristicSubject)
  @AllowNull(false)
  @Column
  customerOrganizationId: string;
  @BelongsTo(() => JuristicSubject)
  customerOrganization?: JuristicSubject;

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column
  organizationId: string;
  @BelongsTo(() => Organization)
  organization?: Organization;

  @ForeignKey(() => Warehouse)
  @AllowNull(false)
  @Column
  warehouseId: string;
  @BelongsTo(() => Warehouse)
  warehouse?: Warehouse;

  @AllowNull(false)
  @Column(DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'))
  status: 'PENDING' | 'APPROVED' | 'REJECTED';

  @AllowNull(false)
  @Min(0)
  @Column
  daysRequested: number;

  @AllowNull(true)
  @Min(0)
  @Column
  daysApproved: number;

  @AllowNull(true)
  @Min(0)
  @Column(DataTypes.DOUBLE)
  maxSum: number;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}
