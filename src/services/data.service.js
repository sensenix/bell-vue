import axios from 'axios';
import authHeader from './auth-header';

const API_URL = '/api/v1/';

class DataService {

    expand(item) {
        let node = {
                    'name': item.name,
                    'nodeclass': item.nodeclass,
                    'nodetype': item.nodetype,
                    'nodetags': item.nodetags,
                    'id': item.id
        }

        // eslint-disable-next-line no-console
        console.log('post getContent', node);
        return axios.post(API_URL + 'expand', { 'item': node }, { headers: authHeader() });
    }

    getContent(item) {
        let node = {
                    'name': item.name,
                    'nodeclass': item.nodeclass,
                    'nodetype': item.nodetype,
                    'nodetags': item.nodetags,
                    'id': item.id
        }

        // eslint-disable-next-line no-console
        console.log('post getContent', node);
        return axios.post(API_URL + 'getContent', { 'item': node }, { headers: authHeader() });
    }

}

export default new DataService();
