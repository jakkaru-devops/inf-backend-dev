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
  ForeignKey,
  AutoIncrement,
} from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import User from './User.model';

@Table({
  tableName: 'UserReview',
})
class UserReview extends Model<UserReview> {
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
  receiverId: string;
  @BelongsTo(() => User, 'receiverId')
  receiver?: User;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  authorId: string;
  @BelongsTo(() => User, 'authorId')
  author?: User;

  @AllowNull(true)
  @Column
  orderId: string;

  @AllowNull(true)
  @Column
  productOfferId: string;

  @AllowNull(false)
  @Column(DataTypes.FLOAT)
  rating: number;

  @AllowNull(false)
  @Column(DataTypes.FLOAT)
  addedRating: number;

  @AllowNull(true)
  @Column(DataTypes.TEXT)
  text: string;

  @AllowNull(false)
  @Column
  status: number;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default UserReview;
