import { Table, HasMany, Unique, Column, Index, AllowNull, Model, PrimaryKey } from 'sequelize-typescript';
import Address from '../../address/models/Address.model';
import { DataTypes } from 'sequelize';
import SelectedRegions from './SelectedRegions.model';

@Table({
  tableName: 'Region',
  timestamps: false,
})
class Region extends Model<Region> {
  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  name: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  type: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  name_with_type: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  federal_district: string;

  @AllowNull(false)
  @Unique
  @PrimaryKey
  @Index({
    name: 'fias_id_idx',
    unique: true,
    using: 'BTREE',
  })
  @Column(DataTypes.UUID)
  fias_id: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  okato: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  oktmo: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  tax_office: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(20))
  postal_code: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(10))
  iso_code: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(10))
  timezone: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(10))
  geoname_code: string;

  @AllowNull(true)
  @Column(DataTypes.INTEGER)
  geoname_id: number;

  @AllowNull(true)
  @Column(DataTypes.STRING(120))
  geoname_name: string;

  @HasMany(() => Address, 'regionFiasId')
  addressRegionFiasIdByFiasId: Address[];

  @HasMany(() => SelectedRegions, 'fiasId')
  selectedRegions: SelectedRegions[];
}

export default Region;
