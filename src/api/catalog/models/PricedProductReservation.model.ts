import {
  Table,
  Unique,
  Column,
  PrimaryKey,
  AllowNull,
  Model,
  AutoIncrement,
  CreatedAt,
  UpdatedAt,
  DeletedAt,
} from 'sequelize-typescript';

@Table({
  tableName: 'PricedProductReservation',
})
export class PricedProductReservation extends Model {
  @PrimaryKey
  @Unique
  @AutoIncrement
  @Column
  id?: number;

  @AllowNull(false)
  @Column
  priceOfferId: number;

  @AllowNull(false)
  @Column
  productId: string;

  @AllowNull(false)
  @Column
  orderId: string;

  @AllowNull(false)
  @Column
  offerId: string;

  @AllowNull(false)
  @Column
  requestProductId: string;

  @AllowNull(false)
  @Column
  offerProductId: string;

  @AllowNull(false)
  @Column
  quantity: number;

  @AllowNull(false)
  @Column
  expiresAt: Date;

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}
