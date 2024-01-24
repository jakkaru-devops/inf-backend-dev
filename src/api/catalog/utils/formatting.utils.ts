import { PRODUCT_GROUP_CATALOGS } from '../data';
import AutoBrand from '../models/AutoBrand.model';
import AutoModel from '../models/AutoModel.model';
import AutoType from '../models/AutoType.model';
import ProductGroup from '../models/ProductGroup.model';

export const formatAutoType = ({
  id,
  label,
  name_ru,
  // nameSimplified,
  createdAt,
  updatedAt,
}: AutoType) => ({
  id,
  label,
  name: name_ru,
  // nameSimplified,
  createdAt,
  updatedAt,
});

export const formatAutoBrand = (
  {
    id,
    label,
    name_ru,
    // nameSimplified,
    activeAutoTypeIds,
    createdAt,
    updatedAt,
  }: AutoBrand,
  params?: { include?: ['autoTypeIds'] },
) => {
  const data = {
    id,
    label,
    // nameSimplified,
    name: name_ru,
    createdAt,
    updatedAt,
  };
  if (params?.include?.includes('autoTypeIds')) {
    data['autoTypeIds'] = JSON.parse(activeAutoTypeIds);
  }
  return data;
};

export const formatAutoModel = ({
  id,
  label,
  name_ru,
  // nameSimplified,
  autoTypeId,
  autoBrandId,
  createdAt,
  updatedAt,
}: AutoModel) => ({
  id,
  label,
  name: name_ru,
  // nameSimplified,
  autoTypeId,
  autoBrandId,
  createdAt,
  updatedAt,
});

export const formatProductGroup = ({
  id,
  label,
  name_ru,
  // nameSimplified,
  nestingLevel,
  parentId,
  catalog,
  createdAt,
  updatedAt,
}: ProductGroup) => ({
  id,
  label,
  name: name_ru,
  // nameSimplified,
  nestingLevel,
  parentId,
  inSideCatalog: PRODUCT_GROUP_CATALOGS.sideList.includes(catalog),
  createdAt,
  updatedAt,
});
