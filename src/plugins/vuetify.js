import '@mdi/font/css/materialdesignicons.css'
import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import VTextField from "vuetify";

Vue.use(Vuetify,{
    components: {
        VTextField,
    }});

export default new Vuetify({
        icons: {
            iconfont: 'mdi',
        },
    }
);
