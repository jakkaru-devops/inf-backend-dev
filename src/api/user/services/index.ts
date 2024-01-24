import { getUserService } from './getUser.service';
import { updateUserService } from './updateUser.service';
import { updateJuristicSubjectService } from './updateJuristicSubject.service';
import { getFavoriteProductListService } from './getFavoriteProductList.service';
import { createFavoriteProductService } from './createFavoriteProduct.service';
import { deleteFavoriteProductService } from './deleteFavoriteProduct.service';

const usersService = {
  getUser: getUserService,
  updateUser: updateUserService,
  updateJuristicSubject: updateJuristicSubjectService,
  getFavoriteProductList: getFavoriteProductListService,
  createFavoriteProduct: createFavoriteProductService,
  deleteFavoriteProduct: deleteFavoriteProductService,
};

export default usersService;
