import { Table, Unique, Column, PrimaryKey, HasMany, Index, AllowNull, Model } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';
import Address from '../../address/models/Address.model';

@Table({
  tableName: 'Settlement',
  timestamps: false,
})
class Settlement extends Model<Settlement> {
  @AllowNull(true)
  @Column(DataTypes.STRING(3))
  areacode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(1))
  autocode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(3))
  citycode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(17))
  code: string;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  enddate: Date;

  @AllowNull(true)
  @Index({
    name: 'formalname_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  // an error with Sequelize (index from fias db)
  // @Index({
  //   name: 'formalname_trgm_idx',
  //   unique: false,
  //   operator: 'gin_trgm_ops',
  //   using: 'GIN',
  //   order: 'ASC'
  // })
  @Column(DataTypes.STRING(120))
  formalname: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  ifnsfl: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  ifnsul: string;

  @AllowNull(true)
  @Index({
    name: 'offname_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  // an error with Sequelize (index from fias db)
  // @Index({
  //   name: 'offname_trgm_idx',
  //   unique: false,
  //   operator: 'gin_trgm_ops',
  //   using: 'GIN',
  //   order: 'ASC'
  // })
  @Column(DataTypes.STRING(120))
  offname: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(11))
  okato: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(11))
  oktmo: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(3))
  placecode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(15))
  plaincode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(6))
  postalcode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(2))
  regioncode: string;

  @AllowNull(true)
  @Index({
    name: 'shortname_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Index({
    name: 'shortname_aolevel_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Column(DataTypes.STRING(10))
  shortname: string;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  startdate: Date;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  streetcode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  terrifnsfl: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  terrifnsul: string;

  @AllowNull(true)
  @Column(DataTypes.DATEONLY)
  updatedate: Date;

  @AllowNull(true)
  @Column(DataTypes.STRING(3))
  ctarcode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  extrcode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(3))
  sextcode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(4))
  plancode: string;

  @AllowNull(true)
  @Column(DataTypes.STRING(100))
  cadnum: string;

  @AllowNull(true)
  @Column(DataTypes.DECIMAL)
  divtype: string;

  @AllowNull(true)
  @Column(DataTypes.INTEGER)
  actstatus: number;

  @AllowNull(true)
  @Index({
    name: 'aoguid_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Unique
  @Column(DataTypes.UUID)
  aoguid: string;

  @AllowNull(true)
  @Index({
    name: 'aoid_idx',
    unique: true,
    using: 'BTREE',
    order: 'ASC',
  })
  @Unique
  @PrimaryKey
  @Column(DataTypes.UUID)
  aoid: string;

  @AllowNull(true)
  @Index({
    name: 'aolevel_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Index({
    name: 'shortname_aolevel_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Column(DataTypes.INTEGER)
  aolevel: number;

  @AllowNull(true)
  @Column(DataTypes.INTEGER)
  centstatus: number;

  @AllowNull(true)
  @Index({
    name: 'currstatus_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Column(DataTypes.INTEGER)
  currstatus: number;

  @AllowNull(true)
  @Column(DataTypes.INTEGER)
  livestatus: number;

  @AllowNull(true)
  @Column(DataTypes.UUID)
  nextid: string;

  @AllowNull(true)
  @Column(DataTypes.UUID)
  normdoc: string;

  @AllowNull(true)
  @Column(DataTypes.INTEGER)
  operstatus: number;

  @AllowNull(true)
  @Index({
    name: 'parentguid_idx',
    unique: false,
    using: 'BTREE',
    order: 'ASC',
  })
  @Column(DataTypes.UUID)
  parentguid: string;

  @AllowNull(true)
  @Column(DataTypes.UUID)
  previd: string;

  @HasMany(() => Address, { sourceKey: 'aoguid', foreignKey: 'areaFiasId' })
  addressAreaFiasIdByAoguid: Address[];

  @HasMany(() => Address, { sourceKey: 'aoguid', foreignKey: 'cityFiasId' })
  addressCityFiasIdByAoguid: Address[];

  @HasMany(() => Address, { sourceKey: 'aoguid', foreignKey: 'settlementFiasId' })
  addressSettlementsFiasIdByAoguid: Address[];
}

export default Settlement;
