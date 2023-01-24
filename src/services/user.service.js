import axios from 'axios';

const API_URL = '/api/v1/';

class UserService {
  getPublicContent() {
    return axios.get(API_URL + 'all');
  }
}

export default new UserService();
