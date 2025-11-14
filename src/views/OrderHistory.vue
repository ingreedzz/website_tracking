<template>
  <section class="container py-6">
    <div class="max-w-4xl mx-auto bg-white p-6 rounded shadow">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-bold">Order Status History — #{{ id }}</h2>
        <button @click="goBack" class="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
      </div>

      <div v-if="loading" class="text-center py-8">
        <div class="text-gray-600">Loading history…</div>
      </div>
      
      <div v-else-if="!order" class="text-center py-8">
        <div class="text-red-600">Order not found.</div>
      </div>
      
      <div v-else>
        <!-- Order Summary -->
        <div class="mb-6 p-4 border rounded bg-gray-50">
          <h3 class="font-semibold mb-2">Order Summary</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div><strong>Customer:</strong> {{ order.customer_name || order.user_name || 'Unknown' }}</div>
            <div><strong>Product:</strong> {{ order.product || '-' }}</div>
            <div><strong>Model:</strong> {{ order.model || '-' }}</div>
            <div><strong>Current Status:</strong> <span :class="statusClass">{{ order.status }}</span></div>
            <div><strong>Payment Status:</strong> <span :class="paymentClass">{{ order.payment_status || 'not submitted' }}</span></div>
            <div><strong>Total:</strong> {{ formatMoney(order.total_price || order.total) }}</div>
          </div>
        </div>

        <!-- Status Change History -->
        <div class="mt-6">
          <h3 class="font-semibold mb-3 text-lg">Status Change History</h3>
          
          <div v-if="!order.history || order.history.length === 0" class="text-center py-8 text-gray-500">
            No history available for this order yet.
          </div>
          
          <div v-else class="space-y-4">
            <div v-for="h in order.history" :key="h.order_status_history_id" 
                 class="p-4 border rounded bg-white hover:shadow-md transition-shadow">
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="flex items-center space-x-2 mb-2">
                    <span class="font-semibold text-gray-700">Status Changed:</span>
                    <span class="px-2 py-1 rounded text-sm bg-red-100 text-red-700">{{ h.old_status || 'initial' }}</span>
                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                    <span class="px-2 py-1 rounded text-sm bg-green-100 text-green-700">{{ h.new_status }}</span>
                  </div>
                  
                  <div class="text-sm text-gray-600 mt-2">
                    <div class="flex items-center space-x-4">
                      <div>
                        <strong>Changed by:</strong> 
                        <span class="ml-1">{{ h.changed_by_name || h.changed_by_email || h.changed_by || 'System' }}</span>
                      </div>
                      <div>
                        <strong>Date:</strong> 
                        <span class="ml-1">{{ formatDate(h.created_at) }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div v-if="h.note" class="mt-2 text-sm">
                    <strong>Note:</strong> 
                    <span class="ml-1 text-gray-700">{{ h.note }}</span>
                  </div>
                  
                  <div class="mt-2 text-xs text-gray-500 space-y-1">
                    <div v-if="h.payment_status">
                      <strong>Payment Status:</strong> {{ h.payment_status }}
                    </div>
                    <div v-if="h.product">
                      <strong>Product:</strong> {{ h.product }}
                    </div>
                    <div v-if="h.customer_name">
                      <strong>Customer:</strong> {{ h.customer_name }}
                    </div>
                    <div v-if="h.order_name">
                      <strong>Order Name:</strong> {{ h.order_name }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 flex space-x-3">
          <button @click="reloadHistory" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Reload History
          </button>
          <button @click="goToDetail" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            View Order Details
          </button>
          <button @click="goBack" class="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiGet } from '../lib/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const order = ref(null)
const loading = ref(true)

console.log('[OrderHistory] Component mounted, order ID:', id);

function formatMoney(v) {
  try {
    return v ? Number(v).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : '-'
  } catch (e) { 
    console.error('[OrderHistory] formatMoney error:', e);
    return String(v || '-') 
  }
}

function formatDate(d) {
  if (!d) return '-'
  try { 
    const date = new Date(d);
    return date.toLocaleString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch (e) { 
    console.error('[OrderHistory] formatDate error:', e);
    return String(d) 
  }
}

const statusClass = computed(() => {
  const s = order.value?.status
  if (s === 'delivered') return 'text-green-600 font-semibold'
  if (s === 'shipped') return 'text-blue-600 font-semibold'
  if (s === 'printing') return 'text-purple-600 font-semibold'
  if (s === 'confirmed') return 'text-indigo-600 font-semibold'
  if (s === 'cancelled') return 'text-red-600 font-semibold'
  return 'text-gray-700'
})

const paymentClass = computed(() => {
  const s = order.value?.payment_status
  if (s === 'completed' || s === 'paid') return 'text-green-600 font-semibold'
  if (s === 'pending') return 'text-yellow-600 font-semibold'
  if (s === 'failed' || s === 'cancelled') return 'text-red-600 font-semibold'
  return 'text-gray-700'
})

async function loadHistory() {
  console.log('[OrderHistory] === Loading order history ===');
  console.log('[OrderHistory] Timestamp:', new Date().toISOString());
  console.log('[OrderHistory] Order ID:', id);
  
  loading.value = true
  try {
    console.log('[OrderHistory] Calling API GET /orders/:id');
    const data = await apiGet(`/orders/${id}`)
    
    console.log('[OrderHistory] ✓ Order data loaded');
    console.log('[OrderHistory] Order status:', data?.status);
    console.log('[OrderHistory] History count:', data?.history?.length || 0);
    
    if (data?.history && data.history.length > 0) {
      console.log('[OrderHistory] History entries:');
      data.history.forEach((h, idx) => {
        console.log(`[OrderHistory]   ${idx + 1}. ${h.old_status} → ${h.new_status} by ${h.changed_by_name || h.changed_by_email || h.changed_by}`);
      });
    } else {
      console.log('[OrderHistory] No history entries found');
    }
    
    order.value = data
    console.log('[OrderHistory] === Load complete ===');
  } catch (e) {
    console.error('[OrderHistory] === Load failed ===');
    console.error('[OrderHistory] Error:', e);
    console.error('[OrderHistory] Error message:', e.message);
    console.error('[OrderHistory] Error stack:', e.stack);
    order.value = null
    alert('Failed to load order history: ' + (e.message || e))
  } finally {
    loading.value = false
  }
}

async function reloadHistory() {
  console.log('[OrderHistory] Reloading history...');
  await loadHistory()
}

function goToDetail() {
  console.log('[OrderHistory] Navigating to order detail:', id);
  try {
    router.push({ name: 'OrderDetail', params: { id: String(id) } })
  } catch (e) {
    console.error('[OrderHistory] Navigation error:', e);
  }
}

function goBack() {
  console.log('[OrderHistory] Navigating back to dashboard');
  try {
    router.push({ name: 'Dashboard' })
  } catch (e) {
    console.error('[OrderHistory] Navigation error:', e);
  }
}

onMounted(() => {
  console.log('[OrderHistory] Component onMounted hook');
  loadHistory()
})
</script>

<style scoped>
.container { 
  max-width: 1200px; 
  margin: 0 auto; 
  padding: 1.5rem; 
}
</style>
