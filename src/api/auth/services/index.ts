import { loginService } from './login.service';
import { getUserTokenService } from './getUserToken.service';

const authService = {
  login: loginService,
  getUserToken: getUserTokenService,
};

export default authService;
