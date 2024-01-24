import { Table, Column, PrimaryKey, AllowNull, Model, Index } from 'sequelize-typescript';
import { DataTypes } from 'sequelize';

@Table({
  tableName: 'SettlementType',
  timestamps: false,
})
class SettlementType extends Model<SettlementType> {
  @AllowNull(true)
  @Column(DataTypes.STRING(50))
  socrname: string;

  @AllowNull(true)
  @Index({
    name: 'scname_level_idx',
    unique: true,
    using: 'BTREE',
  })
  @Column(DataTypes.STRING(10))
  scname: string;

  @AllowNull(true)
  @Index({
    name: 'kod_t_st_idx',
    unique: true,
    using: 'BTREE',
  })
  @Index({
    name: 'socrbase_pkey',
    unique: true,
    using: 'BTREE',
  })
  @PrimaryKey
  @Column(DataTypes.STRING(4))
  kod_t_st: string;

  @AllowNull(true)
  @Index({
    name: 'scname_level_idx',
    unique: true,
    using: 'BTREE',
  })
  @Column(DataTypes.INTEGER)
  level: number;
}

export default SettlementType;
