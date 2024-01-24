import {
  Table,
  Column,
  Default,
  PrimaryKey,
  ForeignKey,
  BelongsTo,
  IsUUID,
  AllowNull,
  Model,
  Index,
  Unique,
} from 'sequelize-typescript';
import Region from './Region.model';
import OrderRequest from '../../order/models/OrderRequest.model';
import { DataTypes } from 'sequelize';

@Table({
  tableName: 'SelectedRegions',
  timestamps: false,
})
class SelectedRegions extends Model<SelectedRegions> {
  @Index({
    name: 'selected_region_fiasId_idx',
    unique: false,
    using: 'BTREE',
  })
  @ForeignKey(() => Region)
  @PrimaryKey
  @AllowNull(false)
  @Column(DataTypes.UUID)
  fiasId: string;
  @BelongsTo(() => Region, 'fiasId')
  fias: Region;

  @Index({
    name: 'selected_region_orderRequestId_idx',
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
}

export default SelectedRegions;
