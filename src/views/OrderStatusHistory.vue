<template>
  <section class="container py-6">
    <div class="max-w-7xl mx-auto bg-white p-6 rounded shadow">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold">Order Status History Dashboard</h2>
        <button @click="goBack" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
      </div>

      <div v-if="loading" class="text-center py-8">
        <div class="text-gray-600">Loading history...</div>
      </div>
      
      <div v-else-if="error" class="text-center py-8">
        <div class="text-red-600">{{ error }}</div>
      </div>
      
      <div v-else>
        <!-- Summary Stats -->
        <div class="grid grid-cols-4 gap-4 mb-6">
          <div class="p-4 border rounded bg-blue-50">
            <div class="text-2xl font-bold text-blue-700">{{ historyRecords.length }}</div>
            <div class="text-sm text-gray-600">Total Changes</div>
          </div>
          <div class="p-4 border rounded bg-green-50">
            <div class="text-2xl font-bold text-green-700">{{ uniqueOrders }}</div>
            <div class="text-sm text-gray-600">Orders Modified</div>
          </div>
          <div class="p-4 border rounded bg-purple-50">
            <div class="text-2xl font-bold text-purple-700">{{ uniqueUsers }}</div>
            <div class="text-sm text-gray-600">Users Involved</div>
          </div>
          <div class="p-4 border rounded bg-orange-50">
            <div class="text-2xl font-bold text-orange-700">{{ todayChanges }}</div>
            <div class="text-sm text-gray-600">Changes Today</div>
          </div>
        </div>

        <!-- Filters -->
        <div class="mb-4 flex space-x-4">
          <div class="flex-1">
            <input v-model="searchQuery" placeholder="Search by customer, product, order name..." class="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <button @click="reloadHistory" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Reload
            </button>
          </div>
        </div>

        <!-- History Table -->
        <div v-if="filteredHistory.length === 0" class="text-center py-8 text-gray-500">
          No history records found.
        </div>
        
        <div v-else class="overflow-x-auto">
          <table class="min-w-full text-left border-collapse">
            <thead>
              <tr class="bg-gray-100">
                <th class="p-2 border">Date/Time</th>
                <th class="p-2 border">Order Name</th>
                <th class="p-2 border">Customer</th>
                <th class="p-2 border">Product</th>
                <th class="p-2 border">Status Change</th>
                <th class="p-2 border">Changed By</th>
                <th class="p-2 border">Payment Status</th>
                <th class="p-2 border">Note</th>
                <th class="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in filteredHistory" :key="h.order_status_history_id" class="hover:bg-gray-50">
                <td class="p-2 border text-sm">{{ formatDateTime(h.created_at) }}</td>
                <td class="p-2 border">{{ h.order_name || '-' }}</td>
                <td class="p-2 border">{{ h.customer_name || '-' }}</td>
                <td class="p-2 border">{{ h.product || '-' }}</td>
                <td class="p-2 border">
                  <div class="flex items-center space-x-2">
                    <span class="px-2 py-1 rounded text-xs bg-red-100 text-red-700">{{ h.old_status || 'initial' }}</span>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                    <span class="px-2 py-1 rounded text-xs bg-green-100 text-green-700">{{ h.new_status }}</span>
                  </div>
                </td>
                <td class="p-2 border text-sm">
                  <div>{{ h.changed_by_name || 'Unknown' }}</div>
                  <div class="text-xs text-gray-500">{{ h.changed_by_email || '-' }}</div>
                </td>
                <td class="p-2 border text-sm">{{ h.payment_status || '-' }}</td>
                <td class="p-2 border text-sm">{{ h.note || '-' }}</td>
                <td class="p-2 border">
                  <button @click="viewOrderDetail(h.order_id)" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                    View Order
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { apiGet } from '../lib/api'

const router = useRouter()
const loading = ref(true)
const error = ref(null)
const historyRecords = ref([])
const searchQuery = ref('')

const loadHistory = async () => {
  loading.value = true
  error.value = null
  console.log('[OrderStatusHistory] Loading all order status history...')
  
  try {
    const data = await apiGet('/order-status-history')
    console.log('[OrderStatusHistory] Received history records:', data?.length || 0)
    historyRecords.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error('[OrderStatusHistory] Failed to load history:', err)
    error.value = 'Failed to load order status history. Please try again.'
    historyRecords.value = []
  } finally {
    loading.value = false
  }
}

const reloadHistory = () => {
  loadHistory()
}

const goBack = () => {
  router.push('/dashboard')
}

const viewOrderDetail = (orderId) => {
  if (orderId) {
    router.push(`/order/${orderId}`)
  }
}

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// Computed properties for statistics
const uniqueOrders = computed(() => {
  const orderIds = new Set(historyRecords.value.map(h => h.order_id))
  return orderIds.size
})

const uniqueUsers = computed(() => {
  const users = new Set(historyRecords.value.map(h => h.changed_by_email || h.changed_by_name || h.changed_by).filter(Boolean))
  return users.size
})

const todayChanges = computed(() => {
  const today = new Date().toDateString()
  return historyRecords.value.filter(h => {
    if (!h.created_at) return false
    return new Date(h.created_at).toDateString() === today
  }).length
})

const filteredHistory = computed(() => {
  if (!searchQuery.value) return historyRecords.value
  
  const query = searchQuery.value.toLowerCase()
  return historyRecords.value.filter(h => {
    return (
      (h.customer_name && h.customer_name.toLowerCase().includes(query)) ||
      (h.product && h.product.toLowerCase().includes(query)) ||
      (h.order_name && h.order_name.toLowerCase().includes(query)) ||
      (h.changed_by_name && h.changed_by_name.toLowerCase().includes(query)) ||
      (h.changed_by_email && h.changed_by_email.toLowerCase().includes(query)) ||
      (h.note && h.note.toLowerCase().includes(query))
    )
  })
})

onMounted(() => {
  loadHistory()
})
</script>
