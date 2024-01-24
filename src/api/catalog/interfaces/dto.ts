import { ILocale } from '../../../interfaces/common.interfaces';
import AutoType from '../models/AutoType.model';
import Product from '../models/Product.model';
import ProductAnalogs from '../models/ProductAnalogs.model';
import ProductGroup from '../models/ProductGroup.model';

export interface ICreateProductAnalogDto {
  productId: ProductAnalogs['productId'];
  analogId: ProductAnalogs['analogId'];
}

export interface IProductApplicability {
  id?: string;
  autoTypeId?: string;
  autoBrandId?: string;
  autoBrandName?: string;
  autoModelId?: string;
  autoModelName?: string;
  article: string;
}

export interface ICreateProductDto {
  userId?: string;
  sourceProductId?: Product['id'];
  status: number;
  article: string;
  additionalArticles?: string[];
  code?: string;
  manufacturer?: string;
  width: number;
  height: number;
  length: number;
  weight: number;
  params?: object;
  files: Array<{
    id: string;
  }>;
  previewFileId?: string;
  acatProductId?: string;
  laximoProductId?: string;
  name?: string;
  description?: string;
  isExternalProduct?: boolean;
  branches: Array<{
    id?: string;
    sourceBranchId?: string;
    isMain: boolean;
    tag: string;
    description: string;
    manufacturer: string;
    autoTypeId: string;
    autoBrandId: string;
    autoModelIds: string[];
    groupId: string;
    subgroupId: string;
  }>;
  analogs?: {
    added: string[];
    deleted: string[];
  }; // analog product ids
  applicabilities?: {
    added: IProductApplicability[];
    updated: IProductApplicability[];
    deleted: string[];
  };
}

export interface IUpdateProductDto extends ICreateProductDto {
  id: string;
}

export interface ICreateProductOfferDto {
  product: ICreateProductDto;
  sourceProductId?: string;
  comment?: string;
}

export interface IUpdateProductOfferDto extends ICreateProductOfferDto {
  id: string;
}

export interface IFrontendProductData {
  id?: string;
  article: string;
  name: string;
  description: string;
  manufacturer: string;
  width: number;
  height: number;
  weight: number;
  length: number;
  params?: object;
  files: Array<{ id: string }>;
  branches: Array<{
    id?: string;
    isMain: boolean;
    tag: string;
    description: string;
    manufacturer: string;
    autoTypeId: string;
    autoBrandId: string;
    autoModelIds: string[];
    groupId: string;
    subgroupId: string;
  }>;
  analogs?: any[];
  applicabilities?: any[];
}

export interface IFrontendProductDataOld {
  article: string;
  additionalArticles?: string[];
  name: string;
  description?: string;
  manufacturer?: string;
  width?: number;
  height?: number;
  length?: number;
  weight?: number;
  files: Array<{
    id: string;
  }>;
  autoTypes: Array<{ id: string }>;
  autoBrands: Array<{ id: string; name: string; autoTypeIds: string[] }>;
  autoModels: Array<{ id: string; name: string; autoTypeId: string; autoBrandId: string }>;
  groups: Array<{
    id: string;
    name: string;
    catalog: ProductGroup['catalog'];
    autoTypeIds: string[];
    autoBrandIds: string[];
  }>;
  subgroups: Array<{
    id: string;
    name: string;
    autoTypeIds: string[];
    autoBrandIds: string[];
    parentId: string;
  }>;
  analogs?: string[]; // analog product ids
  applicabilities?: Array<{
    id?: string;
    autoTypeId?: string;
    autoBrandId?: string;
    autoBrandName?: string;
    autoModelId?: string;
    autoModelName?: string;
    article: string;
  }>;
}
