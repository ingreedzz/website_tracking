<template>
  <section class="p-6">
    <h2 class="text-2xl font-bold mb-4">Dashboard Admin</h2>
    <div class="flex gap-2 mb-4">
      <button @click="refresh" class="px-3 py-2 bg-gray-800 text-white rounded">Show Total Order</button>
      <button @click="logout" class="ml-auto px-3 py-2 bg-red-600 text-white rounded">Log Out</button>
    </div>

    <table class="w-full table-auto border-collapse">
      <thead>
        <tr class="bg-black text-white">
          <th class="px-3 py-2">Order ID</th>
          <th class="px-3 py-2">Customer name</th>
          <th class="px-3 py-2">Product</th>
          <th class="px-3 py-2">Service type</th>
          <th class="px-3 py-2">Status</th>
          <th class="px-3 py-2">Order Date</th>
          <th class="px-3 py-2">Deadline</th>
          <th class="px-3 py-2">Price</th>
          <th class="px-3 py-2">Payment status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="orders.length === 0"><td colspan="9" class="p-6 text-center">No Order</td></tr>
        <tr v-for="o in orders" :key="o.orders_id" class="hover:bg-gray-100 cursor-pointer" @click="goDetail(o.orders_id)">
          <td class="px-2 py-2">{{ o.orders_id }}</td>
          <td class="px-2 py-2">{{ o.user_id }}</td>
          <td class="px-2 py-2">{{ ((o.order_items && o.order_items[0] && o.order_items[0].product_snapshot) || (o.item && o.item.product_snapshot) || {}).product || '-' }}</td>
          <td class="px-2 py-2">{{ ((o.order_items && o.order_items[0] && o.order_items[0].product_snapshot) || (o.item && o.item.product_snapshot) || {}).model || '-' }}</td>
          <td class="px-2 py-2">{{ o.status }}</td>
          <td class="px-2 py-2">{{ o.order_date }}</td>
          <td class="px-2 py-2">{{ o.deadline || '-' }}</td>
          <td class="px-2 py-2">{{ o.total }}</td>
          <td class="px-2 py-2">{{ o.payment_status || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, clearToken } from '../lib/auth'

const orders = ref([])
const router = useRouter()

async function fetchOrders() {
  try {
    const resp = await fetch('/api/orders')
    if (!resp.ok) throw new Error('Failed to fetch orders')
    orders.value = await resp.json()
  } catch (e) {
    console.error('[admin] fetchOrders failed', e)
  }
}

function goDetail(id) {
  router.push({ name: 'AdminOrderDetail', params: { id } }).catch(() => {})
}

function logout() {
  clearToken()
  window.dispatchEvent(new Event('auth-change'))
  router.push({ name: 'Home' }).catch(() => {})
}

function refresh() { fetchOrders() }

onMounted(() => {
  const user = getCurrentUser()
  if (!user || user.role !== 'admin') {
    router.push({ name: 'Home' }).catch(() => {})
    return
  }
  fetchOrders()
})
</script>

<style scoped>
table th, table td { border:1px solid #222 }
</style>
