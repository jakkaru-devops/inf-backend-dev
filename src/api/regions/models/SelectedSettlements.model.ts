import {
  Table,
  Column,
  Default,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Model,
  Index,
} from 'sequelize-typescript';
import Settlement from './Settlement.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import { DataTypes } from 'sequelize';

@Table({
  tableName: 'SelectedSettlements',
  timestamps: false,
})
class SelectedSettlements extends Model<SelectedSettlements> {
  @Index({
    name: 'selected_settlemets_fiasId_idx',
    unique: false,
    using: 'BTREE',
  })
  @ForeignKey(() => Settlement)
  @PrimaryKey
  @AllowNull(false)
  @Column(DataTypes.UUID)
  fiasId: string;
  @BelongsTo(() => Settlement, 'fiasId')
  fias: Settlement;

  @Index({
    name: 'selected_settlemets_userId_idx',
    unique: false,
    using: 'BTREE',
  })
  @ForeignKey(() => OrderRequest)
  @PrimaryKey
  @AllowNull(false)
  @Column
  orderRequestId: string;
  @BelongsTo(() => OrderRequest, 'orderRequestId')
  orderRequest: OrderRequest;

  @AllowNull(false)
  @Column(DataTypes.UUID)
  regionId: string;
}

export default SelectedSettlements;
