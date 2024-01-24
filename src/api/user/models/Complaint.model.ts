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
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from './User.model';
import ComplaintFile from './ComplaintFile.model';
import Notification from '../../notification/models/Notification.model';

@Table({
  tableName: 'Complaint',
})
class Complaint extends Model<Complaint> {
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
  @Column(DataTypes.ARRAY(DataTypes.ENUM('spam', 'behaviour', 'fraud', 'nonobservance')))
  reason: Array<'spam' | 'behaviour' | 'fraud' | 'nonobservance'>;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  comment: string;

  @AllowNull(false)
  @Column
  defendantRoleLabel?: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  defendantId: string;
  @BelongsTo(() => User, 'defendantId')
  defendant?: User;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  appellantId: string;
  @BelongsTo(() => User, 'appellantId')
  appellant?: User;

  @HasMany(() => ComplaintFile, 'complaintId')
  complaintFiles: ComplaintFile[];

  @HasMany(() => Notification, 'userComplaintId')
  notifications: Notification[];

  @HasMany(() => Notification, 'userComplaintId')
  unreadNotifications: Notification[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default Complaint;
