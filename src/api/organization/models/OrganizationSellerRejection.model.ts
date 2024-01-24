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
  DeletedAt,
  BelongsTo,
  AutoIncrement,
  ForeignKey,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Organization from './Organization.model';
import OrganizationSeller from './OrganizationSeller.model';

@Table({
  tableName: 'OrganizationSellerRejection',
})
class OrganizationSellerRejection extends Model<OrganizationSellerRejection> {
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

  @ForeignKey(() => Organization)
  @AllowNull(false)
  @Column
  organizationId: string;
  @BelongsTo(() => Organization, 'organizationId')
  organization?: Organization;

  @ForeignKey(() => OrganizationSeller)
  @AllowNull(false)
  @Column
  organizationSellerId: string;
  @BelongsTo(() => OrganizationSeller, 'organizationSellerId')
  organizationSeller?: OrganizationSeller;

  @AllowNull(false)
  @Column(DataTypes.TEXT)
  message: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isResponded: boolean;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default OrganizationSellerRejection;
