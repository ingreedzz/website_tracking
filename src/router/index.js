import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import OrderDetail from '../views/OrderDetail.vue'

const routes = [
  { path: '/', name: 'Dashboard', component: Dashboard },
  { path: '/dashboard', redirect: '/' },
  { path: '/orders/:id', name: 'OrderDetail', component: OrderDetail, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
