import { createRouter, createWebHistory } from 'vue-router'
import { getCurrentUser } from '../lib/auth'
import Home from '../views/Home.vue'
import Register from '../views/Register.vue'
import Dashboard from '../views/Dashboard.vue'
import Login from '../views/Login.vue'
import OrderDetail from '../views/OrderDetail.vue'
import Payment from '../views/Payment.vue'

const routes = [
  { path: '/', name: 'Home', component: Home },
  { path: '/register', name: 'Register', component: Register },
  { path: '/dashboard', name: 'Dashboard', component: Dashboard },
  { path: '/payment', name: 'Payment', component: Payment },
  { path: '/login', name: 'Login', component: Login },
  { path: '/orders/:id', name: 'OrderDetail', component: OrderDetail, props: true }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Global guard: redirect authenticated users away from login/register pages
router.beforeEach((to, from, next) => {
  const user = getCurrentUser()
  if (user && (to.name === 'Login' || to.name === 'Register')) {
    return next({ name: 'Dashboard' })
  }
  next()
})

export default router
