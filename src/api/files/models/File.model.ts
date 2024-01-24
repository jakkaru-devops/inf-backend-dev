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
  HasOne,
  BelongsTo,
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from '../../user/models/User.model';
import OrganizationFile from '../../organization/models/OrganizationFile.model';
import CustomerRegisterFile from './CustomerRegisterFile.model';
import SellerRegisterFile from './SellerRegisterFile.model';
import AutoType from '../../catalog/models/AutoType.model';
import ProductFile from '../../catalog/models/ProductFile.model';
import DescribedProductFile from '../../catalog/models/DescribedProductFile.model';
import OrderRequestFile from '../../order/models/OrderRequestFile.model';
import RefundExchangeRequestFile from '../../order/models/RefundExchangeRequestFile.model';
import OrganizationUpdateApplicationFile from '../../organization/models/OrganizationUpdateApplicationFile.model';
import ComplaintFile from '../../user/models/ComplaintFile.model';
import SellerUpdateApplicationFile from '../../user/models/SellerUpdateApplicationFile.model';

@Table({
  tableName: 'File',
})
class FileModel extends Model<FileModel> {
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
  @AllowNull(true)
  @Column
  userId: string;
  @BelongsTo(() => User, 'userId')
  user?: User;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  ext: string;

  @AllowNull(false)
  @Column
  size: number;

  @AllowNull(false)
  @Column
  path: string;

  @AllowNull(true)
  @Column
  duration: number;

  @HasOne(() => ProductFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  productFile: ProductFile;

  @HasOne(() => DescribedProductFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  describedProductFile: DescribedProductFile;

  @HasOne(() => OrganizationFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  organizationFile: OrganizationFile;

  @HasOne(() => CustomerRegisterFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  customerRegisterFile: CustomerRegisterFile;

  @HasOne(() => SellerRegisterFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  sellerRegisterFile: SellerRegisterFile;

  @HasOne(() => OrderRequestFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  orderRequestFiles: OrderRequestFile;

  @HasOne(() => RefundExchangeRequestFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  refundExchangeRequestFiles: RefundExchangeRequestFile;

  @HasOne(() => OrganizationUpdateApplicationFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  organizationUpdateApplicationFile: OrganizationUpdateApplicationFile;

  @HasOne(() => ComplaintFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  complaintFile: ComplaintFile;

  @HasOne(() => SellerUpdateApplicationFile, { foreignKey: 'fileId', onDelete: 'CASCADE', hooks: true })
  sellerUpdateApplicationFile: SellerUpdateApplicationFile;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;

  public url?: string;
}

export default FileModel;
