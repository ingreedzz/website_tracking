<template>
  <section class="p-6">
    <h2 class="text-2xl font-bold mb-4">Dashboard Admin</h2>
    <div class="flex gap-2 mb-4">
        <button @click="refresh" class="px-3 py-2 bg-gray-800 text-white rounded">Show Total Order</button>
        <button @click="toggleCreateModel" class="px-3 py-2 bg-green-600 text-white rounded">Create Model</button>
        <button @click="logout" class="ml-auto px-3 py-2 bg-red-600 text-white rounded">Log Out</button>
    </div>

      <div v-if="showCreateModel" class="mb-6 bg-gray-50 p-4 rounded">
        <h3 class="font-semibold mb-2">Create New Model</h3>
        <div class="grid grid-cols-3 gap-3">
          <input v-model="newModel.name" placeholder="Model name (unique)" class="col-span-1 border rounded px-2 py-1" />
          <input v-model="newModel.description" placeholder="Short description" class="col-span-1 border rounded px-2 py-1" />
          <input v-model="newModel.size_fields_raw" placeholder='Size fields JSON (e.g. [{"key":"lingkar_dada","label":"Lingkar Dada","type":"number"}])' class="col-span-1 border rounded px-2 py-1" />
        </div>
        <div class="mt-3">
          <button @click="createModel" class="px-3 py-2 bg-blue-600 text-white rounded">Create</button>
          <button @click="toggleCreateModel" class="ml-2 px-3 py-2 bg-gray-300 rounded">Cancel</button>
        </div>
        <div v-if="modelCreateMsg" class="mt-2 text-sm text-gray-700">{{ modelCreateMsg }}</div>
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
        <tr v-for="o in orders" :key="o.id || o.orders_id" class="hover:bg-gray-100 cursor-pointer" @click="goDetail(o.id || o.orders_id)">
          <td class="px-2 py-2">{{ (o.id || o.orders_id).substring(0, 8) }}...</td>
          <td class="px-2 py-2">{{ o.user_name || 'Unknown' }}</td>
          <td class="px-2 py-2">{{ o.product || '-' }}</td>
          <td class="px-2 py-2">{{ o.model || '-' }}</td>
          <td class="px-2 py-2">{{ o.status }}</td>
          <td class="px-2 py-2">{{ o.order_date ? new Date(o.order_date).toLocaleDateString() : '-' }}</td>
          <td class="px-2 py-2">{{ o.deadline || '-' }}</td>
          <td class="px-2 py-2">Rp {{ formatPrice(o.total || o.total_price) }}</td>
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
import { apiGet } from '../lib/api'
import { apiPost } from '../lib/api'

const orders = ref([])
const showCreateModel = ref(false)
const newModel = ref({ name: '', description: '', size_fields_raw: '' })
const modelCreateMsg = ref('')
const router = useRouter()

function formatPrice(price) {
  if (!price || isNaN(price)) return '0';
  try {
    return Number(price).toLocaleString('id-ID');
  } catch (e) {
    return String(price);
  }
}

async function fetchOrders() {
  console.log('[AdminDashboard] Fetching all orders...');
  try {
    orders.value = await apiGet('/orders')
    console.log('[AdminDashboard] Orders loaded:', orders.value.length);
  } catch (e) {
    console.error('[AdminDashboard] fetchOrders failed', e)
    alert('Failed to fetch orders: ' + (e.message || e))
  }
}

function goDetail(id) {
  console.log('[AdminDashboard] Navigating to order detail:', id);
  router.push({ name: 'AdminOrderDetail', params: { id } }).catch((err) => {
    console.error('[AdminDashboard] Navigation failed:', err);
  })
}

function logout() {
  console.log('[AdminDashboard] Logging out...');
  clearToken()
  window.dispatchEvent(new Event('auth-change'))
  router.push({ name: 'Home' }).catch(() => {})
}

function refresh() { 
  console.log('[AdminDashboard] Refreshing orders...');
  fetchOrders() 
}

function toggleCreateModel() {
  showCreateModel.value = !showCreateModel.value
  modelCreateMsg.value = ''
}

async function createModel() {
  console.log('[AdminDashboard] Creating model...', newModel.value)
  try {
    if (!newModel.value.name) {
      modelCreateMsg.value = 'Name is required'
      return
    }
    let sizeFields = null
    if (newModel.value.size_fields_raw && newModel.value.size_fields_raw.trim()) {
      try {
        sizeFields = JSON.parse(newModel.value.size_fields_raw)
        if (!Array.isArray(sizeFields)) {
          modelCreateMsg.value = 'size_fields must be a JSON array'
          return
        }
      } catch (e) {
        modelCreateMsg.value = 'Invalid JSON for size_fields: ' + e.message
        return
      }
    }

    const payload = { name: newModel.value.name, description: newModel.value.description }
    if (sizeFields) payload.size_fields = sizeFields

    const created = await apiPost('/models', payload)
    console.log('[AdminDashboard] Model created:', created)
    modelCreateMsg.value = 'Model created successfully'
    // reset form and refresh
    newModel.value = { name: '', description: '', size_fields_raw: '' }
    showCreateModel.value = false
    fetchOrders()
  } catch (err) {
    console.error('[AdminDashboard] createModel failed', err)
    modelCreateMsg.value = 'Failed to create model: ' + (err.message || err)
  }
}

onMounted(() => {
  console.log('[AdminDashboard] Component mounted');
  const user = getCurrentUser()
  console.log('[AdminDashboard] Current user:', user ? { users_id: user.users_id, is_admin: user.is_admin } : null);
  
  // Check is_admin field instead of role column (which is being removed)
  const isAdmin = !!user?.is_admin
  if (!user || !isAdmin) {
    console.log('[AdminDashboard] User is not admin, redirecting to home');
    router.push({ name: 'Home' }).catch(() => {})
    return
  }
  fetchOrders()
})
</script>

<style scoped>
table th, table td { border:1px solid #222 }
</style>
