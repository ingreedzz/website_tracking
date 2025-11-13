<template>
  <section class="p-6">
    <h2 class="text-2xl font-bold mb-4">Dashboard Admin</h2>
    <div class="flex gap-2 mb-4">
        <button @click="refresh" class="px-3 py-2 bg-gray-800 text-white rounded">Show Total Order</button>
        <button @click="toggleCreateModel" class="px-3 py-2 bg-green-600 text-white rounded">Create Model</button>
        <button @click="logout" class="ml-auto px-3 py-2 bg-red-600 text-white rounded">Log Out</button>
    </div>

      <div v-if="showCreateModel" class="mb-6 bg-white border-2 border-gray-300 p-6 rounded-lg shadow-md">
        <h3 class="text-xl font-bold mb-4">Create New Model</h3>
        
        <!-- Model Basic Info -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Model Name (required)</label>
          <input v-model="newModel.name" placeholder="e.g., Kaos Oblong Dewasa" class="w-full border rounded px-3 py-2" />
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium mb-1">Description</label>
          <input v-model="newModel.description" placeholder="e.g., Adult t-shirt with custom sizing" class="w-full border rounded px-3 py-2" />
        </div>

        <!-- Dynamic Size Fields Builder -->
        <div class="mb-4">
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium">Size Fields</label>
            <button @click="addSizeField" type="button" class="px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600">
              + Add Field
            </button>
          </div>

          <!-- List of Size Fields -->
          <div v-if="newModel.size_fields.length === 0" class="text-sm text-gray-500 italic p-3 bg-gray-50 rounded">
            No size fields added yet. Click "+ Add Field" to add custom size fields for this model.
          </div>

          <div v-for="(field, index) in newModel.size_fields" :key="index" class="mb-3 p-3 bg-gray-50 rounded border">
            <div class="grid grid-cols-12 gap-2">
              <div class="col-span-3">
                <label class="block text-xs text-gray-600 mb-1">Field Key</label>
                <input v-model="field.key" placeholder="e.g., lingkar_dada" class="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div class="col-span-3">
                <label class="block text-xs text-gray-600 mb-1">Field Label</label>
                <input v-model="field.label" placeholder="e.g., Lingkar Dada" class="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-gray-600 mb-1">Type</label>
                <select v-model="field.type" class="w-full border rounded px-2 py-1 text-sm">
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
              </div>
              <div class="col-span-2">
                <label class="block text-xs text-gray-600 mb-1">Unit</label>
                <input v-model="field.unit" placeholder="e.g., cm" class="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div class="col-span-2 flex items-end">
                <button @click="removeSizeField(index)" type="button" class="w-full px-2 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600">
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Example -->
        <div class="mb-4 p-3 bg-blue-50 rounded text-sm">
          <strong>Example size fields:</strong>
          <ul class="mt-1 ml-4 list-disc text-xs text-gray-700">
            <li>Key: lingkar_dada, Label: Lingkar Dada, Type: number, Unit: cm</li>
            <li>Key: panjang_baju, Label: Panjang Baju, Type: number, Unit: cm</li>
            <li>Key: panjang_lengan, Label: Panjang Lengan, Type: number, Unit: cm</li>
          </ul>
        </div>

        <!-- Action Buttons -->
        <div class="flex items-center space-x-3">
          <button @click="createModel" type="button" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Create Model
          </button>
          <button @click="toggleCreateModel" type="button" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
        </div>

        <!-- Status Message -->
        <div v-if="modelCreateMsg" :class="{'text-green-600': modelCreateMsg.includes('success'), 'text-red-600': !modelCreateMsg.includes('success')}" class="mt-3 text-sm font-medium">
          {{ modelCreateMsg }}
        </div>
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
const newModel = ref({ 
  name: '', 
  description: '', 
  size_fields: [] 
})
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
  // Reset form when opening
  if (showCreateModel.value) {
    newModel.value = { name: '', description: '', size_fields: [] }
  }
}

function addSizeField() {
  newModel.value.size_fields.push({
    key: '',
    label: '',
    type: 'number',
    unit: 'cm'
  })
}

function removeSizeField(index) {
  newModel.value.size_fields.splice(index, 1)
}

async function createModel() {
  console.log('[AdminDashboard] Creating model...', newModel.value)
  try {
    if (!newModel.value.name || !newModel.value.name.trim()) {
      modelCreateMsg.value = 'Model name is required'
      return
    }

    // Validate size fields
    const sizeFields = newModel.value.size_fields.filter(f => f.key && f.label)
    
    // Warn if some fields are incomplete
    if (sizeFields.length < newModel.value.size_fields.length) {
      const incomplete = newModel.value.size_fields.length - sizeFields.length
      console.warn(`[AdminDashboard] ${incomplete} incomplete fields removed`)
    }

    const payload = { 
      name: newModel.value.name.trim(), 
      description: newModel.value.description.trim() || null
    }
    
    // Only include size_fields if there are valid fields
    if (sizeFields.length > 0) {
      payload.size_fields = sizeFields
    }

    const created = await apiPost('/models', payload)
    console.log('[AdminDashboard] Model created:', created)
    modelCreateMsg.value = `Model "${newModel.value.name}" created successfully with ${sizeFields.length} size fields!`
    
    // Reset form after 2 seconds and close
    setTimeout(() => {
      newModel.value = { name: '', description: '', size_fields: [] }
      showCreateModel.value = false
      modelCreateMsg.value = ''
    }, 2000)
    
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
