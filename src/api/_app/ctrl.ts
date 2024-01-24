import { Request, Response } from 'express';
import httpStatus from 'http-status';
import seq, { Op, Sequelize, Transaction } from 'sequelize';
import {
  ADMIN_ACCESS_KEY,
  DEFAULT_USER_LANGUAGE_LABEL,
  ENV,
  UNKNOWN_UPLOAD_SECTION,
  UPLOADS_DATE_FORMAT,
  UPLOAD_FILES_DIRECTORY,
  USERS_UPLOAD_SECTION,
} from '../../config/env';
import { executeTransaction } from '../../utils/transactions.utils';
import { createInitialAddressesService } from './services/createInitialAddresses.service';
import { createInitialLanguageListService } from './services/createInitialLanguageList.service';
import { createInitialRolesService } from './services/createInitialRoles.service';
import { createSuperadminService } from './services/createSuperadmin.service';
import { createSettlements } from './services/createSettlements.service';
import { сheckingInitialData } from './services/сheckingData';
import Settlements from '../regions/models/Settlement.model';
import { createInitialTransportCompaniesService } from './services/createInitialTransportCompanyList';
import { createInitialUsersService } from './services/createInitialUsers.service';
import { createInitialOrganizationsService } from './services/createInitialOrganizations.service';
import path from 'path';
import appRoot from 'app-root-path';
import fs from 'fs';
import { createProductService } from '../catalog/services/createProduct.service';
import {
  ALL_AUTO_BRANDS,
  DEFAULT_AUTO_BRANDS,
  DEFAULT_AUTO_MODELS,
  DEFAULT_AUTO_TYPES,
  DEFAULT_CATALOG_SECTION,
  DEFAULT_PRODUCT_GROUPS,
  PRODUCT_STATUSES,
} from '../catalog/data';
import buffers from './utils/buffers';
import { createInitialProductCategoriesService } from './services/createInitialProductCategories.service';
import { createInitialProductsService } from './services/createInitialProductsService';
import AutoBrand from '../catalog/models/AutoBrand.model';
import { createCatalogSectionService } from '../catalog/services/createCatalogSection.service';
import { createAutoTypeService } from '../catalog/services/createAutoType.service';
import { createAutoBrandService } from '../catalog/services/createAutoBrand.service';
import AutoTypeBrandRelations from '../catalog/models/relations/AutoTypeBrandRelations.model';
import { createAutoModelService } from '../catalog/services/createAutoModel.service';
import { createProductGroupService } from '../catalog/services/createProductGroup.service';
import AutoType from '../catalog/models/AutoType.model';
import AutoModel from '../catalog/models/AutoModel.model';
import ProductGroup from '../catalog/models/ProductGroup.model';
import Product from '../catalog/models/Product.model';
import ProductAnalogs from '../catalog/models/ProductAnalogs.model';
import ProductAutoBrandRelations from '../catalog/models/relations/ProductAutoBrandRelations.model';
import ProductAutoModelRelations from '../catalog/models/relations/ProductAutoModelRelations.model';
import SettlementType from '../regions/models/SettlementType.model';
import { APIError, APIResponse } from '../../utils/api.utils';
import { getDataXlsxFiles, getFilesFromDirectory, getPathToDirectory, getPathToFile } from './utils';
import {
  ALL_PRODUCTS_FILE_PATH,
  ALL_PRODUCTS_FOLDER,
  OUTER_PRODUCTS_DIRECTORY_PATH,
  OUTER_PRODUCTS_JSON_PATH,
  OUTER_PRODUCT_TABLES,
  PRODUCT_ANALOGS_FILE_PATH,
} from './data';
import formatDate from 'date-fns/format';
import { generateLabel, generateRandomCode } from '../../utils/common.utils';
import FileModel from '../files/models/File.model';
import { createDir } from '../files/utils';
import { runCatalogInitService } from './services/runCatalogInit.service';
import Organization from '../organization/models/Organization.model';
import { IOrganizationInfo } from '../organization/interfaces';
import { uploadPdf } from '../../utils/pdf.utils';
import Address from '../address/models/Address.model';
import JuristicSubject from '../user/models/JuristicSubject.model';
import { transformAllProductsService } from './services/transformAllProducts.service';
import { transferPhotoProductsService } from './services/transferPhotoProducts.service';
import { addProductGroupsService } from './services/addProductGroups.service';
import { addProductGroupRelationsService } from './services/addProductGroupRelations.service';
import formatDistance from 'date-fns/formatDistance';
import { IMAGE_EXTENSIONS } from '../../data/common.data';
import ProductApplicability from '../catalog/models/ProductApplicability.model';
import { updateProductWithParsedDataService } from './services/updateProductsWithParsedData.service';
import { updateProductsAnalogsService } from './services/updateProductsAnalogs.service';
import { transformAutoBrandsService } from './services/transformAutoBrands.service';
import { fixAutoBrandGroupRelationsService } from './services/fixAutoBrandGroupRelations.service';
import User from '../user/models/User.model';
import Notification from '../notification/models/Notification.model';
import Role from '../role/models/Role.model';
import UserRoles from '../role/models/UserRoles.model';
import { ENotificationType } from '../notification/interfaces';
import { transformOrdersService } from './services/transformOrders.service';
import { transformProductsBranchesService } from './services/transformProductsBranches.service';
import { transformProductAnalogsAndApplicabilitiesService } from './services/transformProductAnalogsAndApplicabilities.service';
import { transformAllProductGroupsService } from './services/transformAllProductGroups.service';
import { fixProductsBranchesService } from './services/fixProductsBranches.service';
import { updateAllRewardsService } from './services/updateRewards.service';
import { createMissingRewardsService } from './services/createMissingRewards.service';
import { addMissingProductMainBranchesService } from './services/addMissingProductMainBranches.service';
import { updateSellersCategoriesService } from './services/updateSellersCategories.service';
import { fixJuristicSubjectsService } from './services/fixJuristicSubjects.service';
import { addOffersSupplierAddressService } from './services/addOffersSupplierAddress.service';
import { fillProductsTagsJsonService } from './services/fillProductsTagsJson.service';
import { fillRequestProductsReserveDataService } from './services/fillRequestProductsReserveData.service';
import { fillProductsMinPriceService } from './services/fillProductsMinPrice.service';
import { groupProductsByArticleService } from './services/groupProductsByArticle.service';
import { fixProductsPricesService } from './services/fixProductsPrices.service';
import { sortGroupsAppService } from './services/sortGroups.service';
import { hideGroupsAppService } from './services/hideGroups.service';

interface IProductData {
  name: string;
  article: string;
  additionalArticles: string[];
  additionalParams: object;
  orderCode: string;
  link: string;
  price: number;
  brand: string;
  manufacturer: string;
  description: string;
  params: {
    width: number;
    height: number;
    length: number;
    weight: number;
  };
  analogs: Array<{
    name: string;
    price: number;
    orderCode: string;
    brand: string;
    article: string;
    additionalArticle: string;
  }>;
  autoTypes: IAutoTypeData[];
  autoBrands: IAutoBrandData[];
  groups: string[];
  groupsAvtozapchasti: string[];
  groupsAvtotovari: string[];
  groupsInstrument: string[];
  applicabilities: Array<{
    article: string;
    name: string;
    autoType: 'car' | 'engine' | 'tractor' | 'truck' | 'special';
    autoBrand: string;
    autoModel: string;
  }>;
  recommendedProducts: Array<{
    name: string;
    article: string;
    orderCode: string;
  }>;
}

interface IAutoTypeData {
  name: string;
  autoBrands: IAutoBrandData[];
}

interface IAutoBrandData {
  name: string;
  autoModels: Array<{
    name: string;
  }>;
}

const createMethod = (callback: (transaction: Transaction) => Promise<void>) => {
  return async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        const { superadminAccessKey } = req.body;
        if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
          throw APIError({
            res,
            status: httpStatus.FORBIDDEN,
            message: 'Not enough rights',
          });
        }

        const startTime = new Date().getTime();

        await callback(transaction);

        const endTime = new Date().getTime();

        console.log(`Operation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

        return res.status(httpStatus.OK).json({
          message: 'Success',
        });
      } catch (err) {
        console.error(err);
        throw APIError({
          res,
          status: httpStatus.INTERNAL_SERVER_ERROR,
          message: 'Fail',
          error: err,
        });
      }
    });
  };
};
/* const createMethod = async (req: Request, res: Response) => async (callback: () => Promise<void>) => {
  try {
    const { superadminAccessKey } = req.body;
    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    const startTime = new Date().getTime();

    await callback();

    const endTime = new Date().getTime();

    console.log(`Operation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);

    return res.status(httpStatus.OK).json({
      message: 'Success',
    });
  } catch (err) {
    console.error(err);
    throw APIError({
      res,
      status: httpStatus.INTERNAL_SERVER_ERROR,
      message: 'Fail',
      error: err,
    });
  }
}; */

class _AppCtrl {
  /**
   * @desc      Database initialization (performed after adding products).
   * @route     POST /_app
   * @success  { message: 'App was successfully initialized' }
   * @access    Public
   */
  runAppInit = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      try {
        let {
          superadminAccessKey,
          superadminPhone,
          importSettlements,
          createUsersAndOrganizations,
          createInitialCatalog,
        } = req.body;

        if (importSettlements === undefined) importSettlements = false;
        if (createUsersAndOrganizations === undefined) createUsersAndOrganizations = true;
        if (createInitialCatalog === undefined) createInitialCatalog = true;

        //start initial
        const initialStart = async (sellerAutoBrands?: AutoBrand[]) => {
          if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
            throw res.status(httpStatus.FORBIDDEN).json({
              message: 'Not enough rights',
            });
          }

          // const initialData = await сheckingInitialData();
          // if (!initialData.result) {
          //   return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          //     message: 'App initialization failed, problems with loading the initial data',
          //     error: initialData.error,
          //   });
          // }

          const settlementType = await SettlementType.findOne({ transaction });
          if (!settlementType) {
            await createInitialAddressesService({ res, transaction });
          }

          // Import settlements only if there are not settlements in DB
          if (importSettlements) {
            const settlement = await Settlements.findOne({ transaction });
            if (!settlement) {
              await createSettlements({ res, transaction });
            }
          }

          // Create initial roles
          const { roles } = await createInitialRolesService({
            res,
            transaction,
          });

          // Create root admin
          await createSuperadminService({
            phone: superadminPhone,
            superadminRole: roles.superadmin,
            res,
            transaction,
          });

          // Create languages
          const { languageList } = await createInitialLanguageListService({
            res,
            transaction,
          });
          const defaultLanguage = languageList.find(el => el.label === DEFAULT_USER_LANGUAGE_LABEL);

          if (ENV === 'development') {
            const autoType = await AutoType.findOne({
              transaction,
            });

            if (!autoType) {
              let autoBrands: AutoBrand[] = [];
              let autoTypes: AutoType[] = [];

              if (!sellerAutoBrands) {
                // Create product categories
                let categories = await createInitialProductCategoriesService({
                  res,
                  transaction,
                });
                // Create products
                await createInitialProductsService({
                  defaultLanguage,
                  res,
                  transaction,
                });

                autoTypes = categories.autoTypes;
                autoBrands = categories.autoBrands;
              }

              // Get settlement again after creating settlements
              const settlement = await Settlements.findOne();

              // Create users and organizations only if there are settlements in DB
              if (createUsersAndOrganizations && !!settlement) {
                // Create users
                const { employees, sellers } = await createInitialUsersService({
                  roles: {
                    customer: roles.customer,
                    seller: roles.seller,
                    manager: roles.manager,
                    operator: roles.operator,
                    moderator: roles.moderator,
                  },
                  autoTypes,
                  autoBrands,
                  res,
                  transaction,
                });

                // Create organizations
                await createInitialOrganizationsService({
                  managerUser: employees[0],
                  managerRole: employees[0].roles.find(({ roleId }) => roleId === roles.manager.id),
                  sellerUser: sellers[0],
                  res,
                  transaction,
                });
              }
            }
          }

          // Create transport companies
          await createInitialTransportCompaniesService({ res, transaction });
        };

        if (createInitialCatalog) {
          await initialStart();
        } else {
          let sellerProductCategories = buffers.findBuffers('sellerProductCategories');
          if (!sellerProductCategories)
            throw new Error(
              ' To get started, send a request to: "/catalog/create/product-category" \n' +
                ' Then initialize _app \n To further create products, send POST requests:\n ' +
                '1. "/catalog/create/category-relations"\n ' +
                '2."/catalog/create/add-products"',
            );
          await initialStart();
          // await initialStart(sellerProductCategories);
        }

        return res.status(httpStatus.OK).json({
          message: 'App was successfully initialized',
        });
      } catch (err) {
        return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
          message: 'App initialization failed',
          error: err.message,
        });
      }
    });
  };

  generatePhotoProductsJson = async (req: Request, res: Response) => {
    try {
      if (fs.existsSync(OUTER_PRODUCTS_JSON_PATH)) {
        throw APIError({
          res,
          status: httpStatus.BAD_REQUEST,
          message: 'Outer products file already exists',
        });
      }

      const files = getFilesFromDirectory(OUTER_PRODUCTS_DIRECTORY_PATH);
      const PRODUCT_TABLES = getDataXlsxFiles(files);
      const resultProducts: any[] = [];

      async function getProductDataFromOuterTable(productData: any, tableName: string) {
        const outerProduct = OUTER_PRODUCT_TABLES?.[tableName];

        function getProductField(field: string) {
          let result =
            typeof productData?.[outerProduct?.[field]] !== 'undefined' ? productData?.[outerProduct?.[field]] : null;
          if (typeof result === 'string') result = result.trim();
          return result;
        }

        const article: string | number = getProductField('article');
        const name = getProductField('name');

        // Skip first line of tables that contains table titles
        if (!name || !article || article === 'Артикул (каталожный номер)' || article === 'Характеристики') return null;

        let type: string = getProductField('type');
        let brand: string = getProductField('brand');
        const group: string = getProductField('group');
        const subgroup: string = getProductField('subgroup');
        const description = getProductField('description');
        const photosFolder = getProductField('photosFolder')?.toString();
        const width = getProductField('width');
        const height = getProductField('height');
        const length = getProductField('length');
        const weight = getProductField('weight');
        let photo: string = getProductField('photo')?.toString();
        let groupsCatalog: ProductGroup['catalog'] = 'AUTO_PARTS';

        const groupEntity = !!group
          ? await ProductGroup.findOne({
              where: {
                label: generateLabel(group),
                nestingLevel: 0,
                parentId: null,
                catalog: {
                  [Op.ne]: 'AUTO_PARTS',
                },
              },
            })
          : null;
        const groups = [group, subgroup].filter(Boolean);

        if (!!groupEntity) {
          groupsCatalog = groupEntity.catalog;
          brand = null;
        }

        if (!!photo && typeof photo === 'string') {
          for (const ext of IMAGE_EXTENSIONS) {
            if (photo.endsWith(`.${ext}`)) photo = photo.replace(`.${ext}`, '');
          }
          photo = photo.replace(/[^a-zA-Z0-9]/g, '');
          // photo = photo.split('_ ').join('_');
        }

        const photoRootPath = path.join(appRoot + '/_init/catalog/images/gallery/');
        let photoFolderPath: string = !!photo
          ? getPathToFile({
              dirPath: path.join(photoRootPath + outerProduct?.photosFolderName),
              searchFilename: photo,
            })
          : getPathToDirectory(photosFolder, path.join(photoRootPath + outerProduct?.photosFolderName));

        return {
          article: article.toString(),
          name,
          description,
          width,
          weight,
          length,
          height,
          autoTypes: type ? type.split('/') : [],
          autoBrands: brand ? brand.split('/') : [],
          autoModels: [],
          group,
          subgroup,
          groups,
          groupsCatalog,
          photoFolderName: photosFolder,
          photoFolderPath: photoFolderPath ? photoFolderPath.replace(photoRootPath, '').replace(/\\/g, '/') : null,
          tree: {
            0: 'ИЗ EXEL',
            catalog: 'Автозапчасти',
            folder: outerProduct?.photosFolderName,
          },
        };
      }

      for (const TABLE of PRODUCT_TABLES) {
        for (const stringTable of TABLE.data) {
          const productData = await getProductDataFromOuterTable(stringTable, TABLE.name);
          console.log('PRODUCT DATA', productData);
          if (!productData) continue;

          resultProducts.push(productData);
        }
      }

      const data = JSON.stringify(resultProducts, null, 2);
      fs.writeFileSync(OUTER_PRODUCTS_JSON_PATH, data);

      return APIResponse({
        res,
        data: {
          message: 'Products from tables has been transferred to JSON successfully',
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'An error has occured while transferring outer photos',
        error: err,
      });
    }
  };

  runCatalogInit = runCatalogInitService;

  transformAllProducts = transformAllProductsService;

  transferPhotoProducts = transferPhotoProductsService;

  addProductGroups = addProductGroupsService;
  addProductGroupRelations = addProductGroupRelationsService;

  transformApplicabilities = async (req: Request, res: Response) => {
    try {
      const { superadminAccessKey } = req.body;

      if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Not enough rights',
        });
      }

      const startTime = new Date().getTime();

      const allApplicabilities = await ProductApplicability.findAll();
      const autoTypes = await AutoType.findAll();
      const autoBrands = await AutoBrand.findAll();

      let counter = allApplicabilities.length;
      for (const applicability of allApplicabilities) {
        counter--;
        console.log(`${counter} items remain`);

        const updateData: any = {};

        if (!!applicability?.autoTypeId && !autoTypes.map(el => el.id).includes(applicability?.autoTypeId)) {
          const autoTypeEntity = autoTypes.find(
            el => el.name_ru.toLowerCase() === applicability.autoTypeId.toLowerCase(),
          );
          updateData.autoTypeId = autoTypeEntity.id;
        }

        let autoBrandEntity: AutoBrand = null;
        if (!!applicability?.autoBrandName) {
          autoBrandEntity = autoBrands.find(el => el.label === generateLabel(applicability.autoBrandName));
          if (!!autoBrandEntity) {
            updateData.autoBrandId = autoBrandEntity.id;
            updateData.autoBrandName = null;
          }
        } else {
          if (!!applicability?.autoBrandId) {
            autoBrandEntity = autoBrands.find(el => el.id === applicability.autoBrandId);
          }
        }

        if (!!autoBrandEntity && !applicability?.autoModelName) {
          const autoModelEntity = await AutoModel.findOne({
            where: {
              label: generateLabel(applicability.autoModelName),
              autoBrandId: autoBrandEntity.id,
            },
          });
          if (!!autoModelEntity) {
            updateData.autoModelId = autoModelEntity;
            updateData.autoModelName = null;
          }
        }

        await applicability.update(updateData);
      }

      const endTime = new Date().getTime();

      console.log(
        `Applicabilities transformation took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`,
      );

      return res.status(httpStatus.OK).json({
        message: 'The applicabilities transformation has been successfully completed',
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'An error has occured while applicabilities transformation',
        error: err,
      });
    }
  };

  createInitialTransportCompanies = async (req: Request, res: Response) => {
    executeTransaction(async transaction => {
      await createInitialTransportCompaniesService({ res, transaction });

      return APIResponse({
        res,
        data: {
          success: true,
        },
      });
    });
  };

  updateInfoPdgOrganization = async (req: Request, res: Response) => {
    try {
      const allOrganization = await Organization.findAll({
        include: [
          { model: Address, as: 'juristicAddress' },
          { model: Address, as: 'actualAddress' },
          { model: Address, as: 'mailingAddress' },
        ],
      });

      for (const org of allOrganization) {
        const pathToSellerTemplate = 'templates/sellerOrganizationInfo.html';

        let orgNds: string = '';
        if (org.hasNds === true) {
          orgNds = 'НДС 20%';
        } else {
          orgNds = 'Без НДС';
        }

        const files = fs.existsSync(`${UPLOAD_FILES_DIRECTORY}/${org.path}`);

        if (files) {
          await fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${org.path}`);
        }
        const orgData: IOrganizationInfo = {
          inn: org.inn,
          orgnLabel: org.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
          ogrn: org.ogrn,
          kpp: org.kpp,
          orgNameLabel: org.entityType === 'ИП' ? 'Наименование ИП' : 'Наименование юр. лица',
          orgName: org.name,
          email: org.email,
          organizationNds: orgNds,
          juristicAddressCountry: org.juristicAddress.country,
          juristicAddressRegion: org.juristicAddress.region,
          juristicAddressSettlement: org.juristicAddress.settlement,
          juristicAddressStreet: org.juristicAddress.street,
          juristicAddressBuilding: org.juristicAddress.building,
          juristicAddressApartment: org.juristicAddress.apartment,
          mailingAddressCountry: org.mailingAddress.country,
          mailingAddressRegion: org.mailingAddress.region,
          mailingAddressSettlement: org.mailingAddress.settlement,
          mailingAddressStreet: org.mailingAddress.street,
          mailingAddressBuilding: org.mailingAddress.building,
          mailingAddressApartment: org.mailingAddress.apartment,
          actualAddressCountry: org.actualAddress.country,
          actualAddressRegion: org.actualAddress.region,
          actualAddressSettlement: org.actualAddress.settlement,
          actualAddressStreet: org.actualAddress.street,
          actualAddressBuilding: org.actualAddress.building,
          actualAddressApartment: org.actualAddress.apartment,
          bankName: org.bankName,
          bankInn: org.bankInn,
          bankBik: org.bankBik,
          bankKs: org.bankKs,
          bankRs: org.bankRs,
          directorLabel: org.entityType === 'ИП' ? 'ФИО ИП' : 'ФИО директора',
          directorFirstname: org.directorFirstname,
          directorMiddlename: org.directorMiddlename,
          directorLastname: org.directorLastname,
        };

        const sellerInfo = await uploadPdf({
          data: orgData,
          pathToTemplate: pathToSellerTemplate,
          pathToPdfFolder: `organization/${orgData.inn}`,
          pdfName: `${orgData.inn}.pdf`,
        });

        Organization.update(
          { path: sellerInfo.file.path },
          {
            where: {
              id: org.id,
            },
          },
        );
      }

      return APIResponse({
        res,
        data: 'Файлы организаций успешно обновлены',
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Произошла ошибка',
        error: err,
      });
    }
  };

  updateInfoPdgJuristicSubject = async (req: Request, res: Response) => {
    try {
      const allJuristic = await JuristicSubject.findAll({
        include: [
          { model: Address, as: 'juristicAddress' },
          { model: Address, as: 'mailingAddress' },
        ],
      });

      for (const jurSubj of allJuristic) {
        const pathToCustomerTemplate = 'templates/customerOrganizationInfo.html';

        let orgNds: string = '';
        if (jurSubj.hasNds === true) {
          orgNds = 'НДС 20%';
        } else {
          orgNds = 'Без НДС';
        }

        const files = fs.existsSync(`${UPLOAD_FILES_DIRECTORY}/${jurSubj.path}`);

        if (files) {
          await fs.unlinkSync(`${UPLOAD_FILES_DIRECTORY}/${jurSubj.path}`);
        }
        const jurSubjData: IOrganizationInfo = {
          inn: jurSubj.inn,
          orgnLabel: jurSubj.entityType === 'ИП' ? 'ОГРНИП' : 'ОГРН',
          ogrn: jurSubj.ogrn,
          kpp: jurSubj.kpp,
          orgNameLabel: jurSubj.entityType === 'ИП' ? 'Наименование ИП' : 'Наименование юр. лица',
          orgName: jurSubj.name,
          email: jurSubj.email,
          organizationNds: orgNds,
          juristicAddressCountry: jurSubj.juristicAddress.country,
          juristicAddressRegion: jurSubj.juristicAddress.region,
          juristicAddressSettlement: jurSubj.juristicAddress.settlement,
          juristicAddressStreet: jurSubj.juristicAddress.street,
          juristicAddressBuilding: jurSubj.juristicAddress.building,
          juristicAddressApartment: jurSubj.juristicAddress.apartment,
          mailingAddressCountry: jurSubj.mailingAddress.country,
          mailingAddressRegion: jurSubj.mailingAddress.region,
          mailingAddressSettlement: jurSubj.mailingAddress.settlement,
          mailingAddressStreet: jurSubj.mailingAddress.street,
          mailingAddressBuilding: jurSubj.mailingAddress.building,
          mailingAddressApartment: jurSubj.mailingAddress.apartment,
          bankName: jurSubj.bankName,
          bankInn: jurSubj.bankInn,
          bankBik: jurSubj.bankBik,
          bankKs: jurSubj.bankKs,
          bankRs: jurSubj.bankRs,
        };

        const customerInfo = await uploadPdf({
          data: jurSubjData,
          pathToTemplate: pathToCustomerTemplate,
          pathToPdfFolder: `juristicData/${jurSubjData.inn}`,
          pdfName: `${jurSubjData.inn}.pdf`,
        });

        Organization.update(
          { path: customerInfo.file.path },
          {
            where: {
              id: jurSubj.id,
            },
          },
        );
      }

      return APIResponse({
        res,
        data: 'Файлы юридических субъектов успешно обновлены',
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Произошла ошибка',
        error: err,
      });
    }
  };

  checkMissingMarks = (req: Request, res: Response) => {
    try {
      const { superadminAccessKey } = req.body;

      if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Not enough rights',
        });
      }

      const startTime = new Date().getTime();

      let PRODUCTS_LENGTH = 0;
      const PRODUCTS_FILE_NAMES = fs.readdirSync(ALL_PRODUCTS_FOLDER);

      // Get products length
      for (const PRODUCTS_FILE_NAME of PRODUCTS_FILE_NAMES) {
        const path = ALL_PRODUCTS_FOLDER + '/' + PRODUCTS_FILE_NAME;
        const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(path) as any);
        PRODUCTS_LENGTH += PRODUCTS.length;
      }
      console.log('TOTAL PRODUCTS LENGTH =', PRODUCTS_LENGTH);

      const counters = {
        ssangyong_types: 0,
        ssangyong_brands: 0,
        vw_types: 0,
        vw_brands: 0,
        mercedes_types: 0,
        mercedes_brands: 0,
      };

      // Create products
      let i = PRODUCTS_LENGTH;
      for (const PRODUCTS_FILE_NAME of PRODUCTS_FILE_NAMES) {
        const path = ALL_PRODUCTS_FOLDER + '/' + PRODUCTS_FILE_NAME;
        const PRODUCTS: IProductData[] = JSON.parse(fs.readFileSync(path) as any);

        for (const productData of PRODUCTS) {
          const autoTypes = productData?.autoTypes || [];
          const autoBrands = productData?.autoBrands || [];

          for (const autoType of autoTypes) {
            if ((autoType.autoBrands || []).find(el => el.name.toLowerCase().includes('ssangyong'))) {
              counters.ssangyong_types += 1;
              console.log('SSANGYONG in types');
            }
            if (
              (autoType.autoBrands || []).find(
                el => el.name.toLowerCase() === 'vw' || el.name.toLowerCase() === 'volkswagen',
              )
            ) {
              counters.vw_types += 1;
              console.log('VW in types');
            }
            if ((autoType.autoBrands || []).find(el => el.name.toLowerCase().includes('mercedes'))) {
              counters.mercedes_types += 1;
              console.log('MERCEDES in types');
            }
          }

          if ((autoBrands || []).find(el => el.name.toLowerCase().includes('ssangyong'))) {
            counters.ssangyong_brands += 1;
            console.log('SSANGYONG in brands');
          }
          if ((autoBrands || []).find(el => el.name.toLowerCase() === 'vw' || el.name.toLowerCase() === 'volkswagen')) {
            counters.vw_brands += 1;
            console.log('VW in brands');
          }
          if ((autoBrands || []).find(el => el.name.toLowerCase().includes('mercedes'))) {
            counters.mercedes_brands += 1;
            console.log('MERCEDES in brands');
          }

          console.log(`Product ${productData.article} handled`);
          i--;
          console.log(`${i} products remaining`);
        }
      }

      const endTime = new Date().getTime();

      console.log(`Products transfer took ${(endTime - startTime) / 1000}s, ${formatDistance(startTime, endTime)}`);
      console.log(counters);

      return res.status(httpStatus.OK).json({
        message: 'The products catalog has been successfully initialized',
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Произошла ошибка',
        error: err,
      });
    }
  };

  createUsersDummyNotifications = async (req: Request, res: Response) => {
    try {
      const { superadminAccessKey } = req.body;

      if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
        throw APIError({
          res,
          status: httpStatus.FORBIDDEN,
          message: 'Not enough rights',
        });
      }

      const customerRole = await Role.findOne({
        where: {
          label: 'customer',
        },
      });
      const sellerRole = await Role.findOne({
        where: {
          label: 'seller',
        },
      });
      const users = await User.findAll({
        include: [
          {
            model: Notification,
            as: 'notifications',
            required: false,
            where: {
              type: 'dummy',
              aboutUserRoleId: [customerRole.id, sellerRole.id],
            },
          },
        ],
      });

      const managerRole = await Role.findOne({
        where: {
          label: 'manager',
        },
      });
      const managers = await User.findAll({
        include: [
          {
            model: UserRoles,
            as: 'roles',
            where: {
              roleId: managerRole.id,
            },
          },
        ],
      });
      const operatorRole = await Role.findOne({
        where: {
          label: 'operator',
        },
      });
      const operators = await User.findAll({
        include: [
          {
            model: UserRoles,
            as: 'roles',
            where: {
              roleId: operatorRole.id,
            },
          },
        ],
      });

      async function handleUsers(role: Role) {
        for (const user of users) {
          const notification = user?.notifications?.find(el => el.aboutUserRoleId === role.id);
          if (!!notification) {
            await notification.update({
              viewedAt: user.createdAt,
              createdAt: user.createdAt,
              updatedAt: user.createdAt,
            });
          } else {
            for (const manager of managers) {
              await Notification.create({
                userId: manager.id,
                roleId: managerRole.id,
                type: ENotificationType.dummy,
                autoread: true,
                aboutUserId: user.id,
                aboutUserRoleId: role.id,
                viewedAt: user.createdAt,
                createdAt: user.createdAt,
                updatedAt: user.createdAt,
              });
            }
            for (const operator of operators) {
              await Notification.create({
                userId: operator.id,
                roleId: operatorRole.id,
                type: ENotificationType.dummy,
                autoread: true,
                aboutUserId: user.id,
                aboutUserRoleId: role.id,
                viewedAt: user.createdAt,
                createdAt: user.createdAt,
                updatedAt: user.createdAt,
              });
            }
          }
        }
      }

      handleUsers(customerRole);
      handleUsers(sellerRole);

      return APIResponse({
        res,
        data: {
          success: true,
        },
      });
    } catch (err) {
      throw APIError({
        res,
        status: httpStatus.INTERNAL_SERVER_ERROR,
        message: 'Ошибка',
        error: err,
      });
    }
  };

  createOperatorRole = async (req: Request, res: Response) => {
    const { superadminAccessKey } = req.body;

    if (superadminAccessKey !== ADMIN_ACCESS_KEY) {
      throw APIError({
        res,
        status: httpStatus.FORBIDDEN,
        message: 'Not enough rights',
      });
    }

    // Create operator role
    const operator = await Role.create({
      label: 'operator',
      supportChatsAvailable: true,
      exploreAllOrderRequestsAvailable: true,
      exploreOrderRequestsAndOrdersAvailable: true,
      organizationsAvailable: true,
      manageAllSellerDataAvailable: true,
      banAvailable: true,
      inspectUsersInfoAvailable: true,
      readComplainAvailable: true,
      rewardsAvailable: true,
      moderateOrganizationsAvailable: true,
      payOrderSellerFee: true,
    });

    return APIResponse({
      res,
      data: {
        success: true,
      },
    });
  };

  updateProductsWithParsedData = updateProductWithParsedDataService;
  updateProductsAnalogs = updateProductsAnalogsService;
  transformAutoBrands = transformAutoBrandsService;
  fixAutoBrandGroupRelations = fixAutoBrandGroupRelationsService;

  transformOrders = transformOrdersService;
  transformProductsBranches = transformProductsBranchesService;
  transformProductAnalogsAndApplicabilities = transformProductAnalogsAndApplicabilitiesService;
  transformAllProductGroups = transformAllProductGroupsService;
  fixProductsBranches = fixProductsBranchesService;
  updateAllRewards = updateAllRewardsService;
  createMissingRewards = createMissingRewardsService;
  addMissingProductMainBranches = addMissingProductMainBranchesService;
  updateSellersCategories = updateSellersCategoriesService;
  fixJuristicSubjects = fixJuristicSubjectsService;
  addOffersSupplierAddress = addOffersSupplierAddressService;
  fillProductsTagsJson = fillProductsTagsJsonService;
  fillRequestProductsReserveData = fillRequestProductsReserveDataService;
  fillProductsMinPrice = fillProductsMinPriceService;
  groupProductsByArticle = groupProductsByArticleService;
  fixProductsPrices = fixProductsPricesService;

  sortGroups = createMethod(async () => {
    await sortGroupsAppService({ transaction: null });
  });

  hideGroups = createMethod(async transaction => {
    await hideGroupsAppService({ transaction });
  });
}

export default _AppCtrl;
