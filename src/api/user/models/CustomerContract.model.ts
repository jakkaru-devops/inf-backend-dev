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
import FileModel from '../../files/models/File.model';
import CustomerContractSpecification from './CustomerContractSpecification.model';
import JuristicSubject from './JuristicSubject.model';

@Table({
  tableName: 'CustomerContract',
})
class CustomerContract extends Model {
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
  customerId: string;
  @BelongsTo(() => User, 'customerId')
  customer?: User;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column
  creatorUserId: string;
  @BelongsTo(() => User, 'creatorUserId')
  creatorUser?: User;

  @ForeignKey(() => JuristicSubject)
  @AllowNull(false)
  @Column
  juristicSubjectId: string;
  @BelongsTo(() => JuristicSubject, 'juristicSubjectId')
  juristicSubject?: JuristicSubject;

  @ForeignKey(() => FileModel)
  @AllowNull(false)
  @Column
  fileId: string;
  @BelongsTo(() => FileModel, 'fileId')
  file?: FileModel;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  number: string;

  @AllowNull(false)
  @Column(DataTypes.DATEONLY)
  date: Date;

  @AllowNull(true)
  @Column
  directorFirstName: string;

  @AllowNull(true)
  @Column
  directorLastName: string;

  @AllowNull(true)
  @Column
  directorMiddleName: string;

  @AllowNull(true)
  @Column
  directorPost: string;

  @AllowNull(true)
  @Column
  basisName: string;

  @AllowNull(false)
  @Default(false)
  @Column
  signerIsDirector: boolean;

  @AllowNull(true)
  @Column
  signerFirstName: string;

  @AllowNull(true)
  @Column
  signerLastName: string;

  @AllowNull(true)
  @Column
  signerMiddleName: string;

  @AllowNull(true)
  @Column
  signerPost: string;

  @HasMany(() => CustomerContractSpecification, 'contractId')
  specifications: CustomerContractSpecification[];

  @CreatedAt
  readonly createdAt?: Date;

  @UpdatedAt
  readonly updatedAt?: Date;

  @DeletedAt
  readonly deletedAt?: Date;
}

export default CustomerContract;
