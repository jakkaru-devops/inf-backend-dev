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

@Table({
  tableName: 'OrganizationRejection',
})
class OrganizationRejection extends Model<OrganizationRejection> {
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

  @AllowNull(false)
  @Column
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

export default OrganizationRejection;
