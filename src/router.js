import Vue from 'vue';
import Router from 'vue-router';
import Login from './views/Login.vue';

Vue.use(Router);

export const router = new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('./views/BellTree.vue')
    },
    {
      path: '/login',
      component: Login
    },
    {
      path: '/tree',
      name: 'tree',
      // lazy-loaded
      component: () => import('./views/BellTree.vue')
    },
    {
      path: '/profile',
      name: 'profile',
      // lazy-loaded
      component: () => import('./views/Profile.vue')
    }
  ]
});
