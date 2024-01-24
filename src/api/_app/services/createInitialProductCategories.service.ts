import { Response } from 'express';
import { Transaction } from 'sequelize';
import httpStatus from 'http-status';
import Language from '../../language/models/Language.model';
import CatalogSection from '../../catalog/models/CatalogSection.model';
import AutoType from '../../catalog/models/AutoType.model';
import AutoBrand from '../../catalog/models/AutoBrand.model';
import AutoTypeBrandRelations from '../../catalog/models/relations/AutoTypeBrandRelations.model';
import AutoModel from '../../catalog/models/AutoModel.model';
import ProductGroup from '../../catalog/models/ProductGroup.model';
import { DEFAULT_AUTO_TYPES, DEFAULT_CATALOG_SECTION, PRODUCT_CATEGORY_STATUSES } from '../../catalog/data';
import { APIError } from '../../../utils/api.utils';
import { createCatalogSectionService } from '../../catalog/services/createCatalogSection.service';
import { createAutoTypeService } from '../../catalog/services/createAutoType.service';

type IProps = {
  res: Response;
  transaction: Transaction;
};

export interface IResult {
  catalogSections: CatalogSection[];
  autoTypes: AutoType[];
  autoBrands: AutoBrand[];
  autoModels: AutoModel[];
  productGroups: ProductGroup[];
  productSubroups: ProductGroup[];
}

export const createInitialProductCategoriesService = async ({ res, transaction }: IProps): Promise<IResult> => {
  try {
    const { catalogSection } = await createCatalogSectionService({
      ...DEFAULT_CATALOG_SECTION,
      res,
      transaction,
    });

    const createdAutoTypeList: AutoType[] = [];
    for (const autoType of DEFAULT_AUTO_TYPES) {
      createdAutoTypeList.push(
        (
          await createAutoTypeService({
            ...autoType,
            catalogSectionId: catalogSection.id,
            res,
            transaction,
          })
        ).autoType,
      );
    }

    const initialAutoBrands = [
      { label: 'mtlb', name_ru: 'МТЛБ', autoTypes: ['spectehnika'] },
      { label: 'kamaz', name_ru: 'КАМАЗ', autoTypes: ['gruzovye'] },
      { label: 'uaz', name_ru: 'УАЗ', autoTypes: ['legkovye'] },
    ];
    const createdAutoBrandList: AutoBrand[] = [];
    for (const autoBrandData of initialAutoBrands) {
      const createdAutoBrand = await AutoBrand.create(
        {
          label: autoBrandData.label,
          name_ru: autoBrandData.name_ru,
          catalogSectionId: catalogSection.id,
          status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
          activeAutoTypeIds: JSON.stringify(
            createdAutoTypeList.filter(el => autoBrandData.autoTypes.includes(el.label)).map(el => el.id),
          ),
        },
        {
          transaction,
        },
      );
      for (const autoType of autoBrandData.autoTypes) {
        await AutoTypeBrandRelations.create(
          {
            autoBrandId: createdAutoBrand.id,
            autoTypeId: createdAutoTypeList.find(({ label }) => label === autoType).id,
          },
          {
            transaction,
          },
        );
      }
      createdAutoBrandList.push(createdAutoBrand);
    }

    const initialAutoModels = [
      { label: 'mtlb', name_ru: 'МТЛБ', relations: { autoType: 'spectehnika', autoBrand: 'mtlb' } },
      { label: 'kamaz-65115', name_ru: 'КамАЗ-65115', relations: { autoType: 'gruzovye', autoBrand: 'kamaz' } },
      { label: 'uaz-3102', name_ru: 'УАЗ-3102', relations: { autoType: 'legkovye', autoBrand: 'uaz' } },
      { label: 'uaz-452', name_ru: 'УАЗ-452', relations: { autoType: 'legkovye', autoBrand: 'uaz' } },
      { label: 'uaz-469', name_ru: 'УАЗ-469', relations: { autoType: 'legkovye', autoBrand: 'uaz' } },
      { label: 'uaz-3741', name_ru: 'УАЗ-3741', relations: { autoType: 'legkovye', autoBrand: 'uaz' } },
      { label: 'uaz-2206', name_ru: 'УАЗ-2206', relations: { autoType: 'legkovye', autoBrand: 'uaz' } },
      { label: 'uaz-3909', name_ru: 'УАЗ-3909', relations: { autoType: 'legkovye', autoBrand: 'uaz' } },
    ];
    const createdAutoModels: AutoModel[] = [];
    for (const autoModel of initialAutoModels) {
      createdAutoModels.push(
        await AutoModel.create(
          {
            label: autoModel.label,
            name_ru: autoModel.name_ru,
            status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
            isHidden: false,
            catalogSectionId: catalogSection.id,
            autoTypeId: createdAutoTypeList.find(({ label }) => label === autoModel.relations.autoType).id,
            autoBrandId: createdAutoBrandList.find(({ label }) => label === autoModel.relations.autoBrand).id,
          },
          {
            transaction,
          },
        ),
      );
    }

    const initialGroups = [
      { label: 'dvigatel', name_ru: 'Двигатель' },
      { label: 'hodovayaChast', name_ru: 'Ходовая часть' },
      { label: 'transmissiya', name_ru: 'Трансмиссия' },
    ];
    const createdGroups: ProductGroup[] = [];
    for (const group of initialGroups) {
      createdGroups.push(
        await ProductGroup.create(
          {
            label: group.label,
            name_ru: group.name_ru,
            status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
            isHidden: false,
            catalogSectionId: catalogSection.id,
            nestingLevel: 0,
            catalog: 'AUTO_PARTS',
          },
          {
            transaction,
          },
        ),
      );
    }

    const initialSubgroups = [
      { label: 'sistemaVypuskaGazov', name_ru: 'Система выпуска газов', parent: 'dvigatel' },
      { label: 'podveska', name_ru: 'Подвеска', parent: 'hodovayaChast' },
      { label: 'sceplenie', name_ru: 'Сцепление', parent: 'transmissiya' },
    ];
    const createdSubgroups: ProductGroup[] = [];
    for (const subgroup of initialSubgroups) {
      createdSubgroups.push(
        await ProductGroup.create(
          {
            label: subgroup.label,
            name_ru: subgroup.name_ru,
            status: PRODUCT_CATEGORY_STATUSES.DEFAULT,
            isHidden: false,
            parentId: createdGroups.find(({ label }) => label === subgroup.parent).id,
            catalogSectionId: catalogSection.id,
            nestingLevel: 1,
            catalog: 'AUTO_PARTS',
          },
          {
            transaction,
          },
        ),
      );
    }

    return {
      catalogSections: [catalogSection],
      autoTypes: createdAutoTypeList,
      autoBrands: createdAutoBrandList,
      autoModels: createdAutoModels,
      productGroups: createdGroups,
      productSubroups: createdSubgroups,
    };
  } catch (err) {
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: `An error has occured while creating initial product categories`,
      error: err,
      strict: true,
    });
  }
};
