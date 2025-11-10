<template>
  <section class="p-6">
    <button @click="goBack" class="mb-4 px-3 py-2 bg-gray-800 text-white rounded">Go Back</button>
    <h2 class="text-2xl font-bold mb-4">Check Order Detail (Admin)</h2>

    <div v-if="!order">Loading...</div>
    <div v-else class="grid grid-cols-2 gap-6">
      <div>
        <div class="mb-2"><strong>Product:</strong> {{ itemSnapshot.product || '-' }}</div>
        <div class="mb-2"><strong>Model:</strong> {{ itemSnapshot.model || '-' }}</div>
        <div class="mb-2"><strong>Size:</strong> {{ itemSnapshot.size || '-' }}</div>
        <div class="mb-2"><strong>Color:</strong> {{ itemSnapshot.color || '-' }}</div>

        <div class="mt-4">
          <label class="block mb-1">Status</label>
          <select v-model="selectedStatus" class="border p-2">
            <option>created</option>
            <option>processing</option>
            <option>shipped</option>
            <option>delivered</option>
            <option>cancelled</option>
            <option>refund_return</option>
          </select>
          <div class="mt-2">
            <button @click="updateStatus" class="px-3 py-2 bg-blue-600 text-white rounded">Update Status</button>
          </div>
        </div>

        <div class="mt-6">
          <h3 class="font-semibold">Received / Delivered</h3>
          <div class="mb-2">Received date: {{ order.received_date || '-' }}</div>
          <div class="mb-2">Received status: {{ order.is_delivered ? 'true' : 'false' }}</div>
          <div class="mb-2">Delivered date: {{ order.delivered_date || '-' }}</div>
          <div class="mb-2">Delivered status: {{ order.delivered_date ? 'true' : 'false' }}</div>
        </div>

      </div>

      <div>
        <div><strong>Address:</strong> {{ address.address || '-' }}</div>
        <div class="mt-4">
          <strong>Payment</strong>
          <div>Payment status: {{ order.payment_status || '-' }}</div>
          <div v-if="payment">Payment amount: {{ payment.amount }} - status: {{ payment.status }}</div>
          <div class="mt-2">
            <button @click="markPaymentValid" class="px-3 py-2 bg-green-600 text-white rounded mr-2">Mark Payment Valid</button>
            <button @click="markPaymentInvalid" class="px-3 py-2 bg-red-600 text-white rounded">Mark Payment Invalid</button>
          </div>
        </div>

        <div class="mt-6">
          <div><strong>Sablon image</strong></div>
          <div class="w-64 h-64 bg-gray-200 flex items-center justify-center mt-2">
            <img v-if="sablonUrl" :src="sablonUrl" alt="sablon" class="max-w-full max-h-full" />
            <span v-else>No image</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { getCurrentUser, getToken } from '../lib/auth'
import { apiGet } from '../lib/api'

const router = useRouter()
const route = useRoute()
const id = route.params.id

const order = ref(null)
const itemSnapshot = ref({})
const address = ref({})
const payment = ref(null)
const sablonUrl = ref('')
const selectedStatus = ref('')

async function fetchOrder() {
  console.log('[AdminOrderDetail] Fetching order:', id);
  try {
    const data = await apiGet('/orders/' + id)
    console.log('[AdminOrderDetail] Order loaded:', data);
    order.value = data
    selectedStatus.value = data.status || 'created'
    
    // With normalized response, product info is already flattened
    if (data.product) {
      itemSnapshot.value = {
        product: data.product,
        model: data.model,
        size: data.size,
        color: data.color
      }
    } else {
      // Fallback: check order_items array
      const item = (data.order_items && data.order_items.length) ? data.order_items[0] : (data.item || null)
      if (item && item.product_snapshot) itemSnapshot.value = item.product_snapshot
    }
    
    // fetch address (order_addresses) — simple query
    try {
      const arr = await apiGet('/order_addresses?order_id=' + id)
      address.value = Array.isArray(arr) && arr.length ? arr[0] : {}
      console.log('[AdminOrderDetail] Address loaded:', address.value);
    } catch (e) {
      console.warn('[AdminOrderDetail] Failed to load address:', e);
    }
    
    // try to fetch payment row
    try {
      const arr = await apiGet('/payments?order_id=' + id)
      payment.value = Array.isArray(arr) && arr.length ? arr[0] : null
      console.log('[AdminOrderDetail] Payment loaded:', payment.value);
    } catch (e) {
      console.warn('[AdminOrderDetail] Failed to load payment:', e);
    }
    
    // Set sablon URL from normalized response or order_items
    if (data.sablon_url) {
      sablonUrl.value = data.sablon_url
    } else if (data.sablon_path) {
      sablonUrl.value = '/storage/' + data.sablon_path
    } else {
      const item = (data.order_items && data.order_items.length) ? data.order_items[0] : (data.item || null)
      if (item && item.sablon_path) {
        sablonUrl.value = '/storage/' + item.sablon_path
      }
    }
    console.log('[AdminOrderDetail] Sablon URL:', sablonUrl.value);
  } catch (e) {
    console.error('[AdminOrderDetail] fetchOrder failed', e)
    alert('Failed to load order: ' + (e.message || e))
  }
}

function goBack() { 
  console.log('[AdminOrderDetail] Going back to admin dashboard');
  router.push({ name: 'AdminDashboard' }).catch(() => {}) 
}

async function updateStatus() {
  console.log('[AdminOrderDetail] Updating status to:', selectedStatus.value);
  try {
    const token = getToken()
    const resp = await fetch('/api/server/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status: selectedStatus.value })
    })
    if (!resp.ok) { 
      const t = await resp.text(); 
      console.error('[AdminOrderDetail] Update status failed:', t);
      throw new Error(t || 'Failed to update') 
    }
    console.log('[AdminOrderDetail] Status updated successfully');
    await fetchOrder()
    alert('Status updated')
  } catch (e) { 
    console.error('[AdminOrderDetail] Update status error:', e);
    alert(e.message || String(e)) 
  }
}

async function markPaymentValid() {
  console.log('[AdminOrderDetail] Marking payment as valid');
  try {
    const token = getToken()
    const resp = await fetch('/api/server/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status: 'processing', payment_status: 'confirmed', note: 'Payment validated by admin' })
    })
    if (!resp.ok) {
      console.error('[AdminOrderDetail] Mark payment valid failed');
      throw new Error('Failed to mark payment valid')
    }
    console.log('[AdminOrderDetail] Payment marked as valid');
    await fetchOrder()
    alert('Payment marked as valid')
  } catch (e) { 
    console.error('[AdminOrderDetail] Mark payment valid error:', e);
    alert(e.message || String(e)) 
  }
}

async function markPaymentInvalid() {
  console.log('[AdminOrderDetail] Marking payment as invalid');
  try {
    const token = getToken()
    const resp = await fetch('/api/server/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status: 'cancelled', payment_status: 'invalid', note: 'Payment marked invalid' })
    })
    if (!resp.ok) {
      console.error('[AdminOrderDetail] Mark payment invalid failed');
      throw new Error('Failed to mark payment invalid')
    }
    console.log('[AdminOrderDetail] Payment marked as invalid');
    await fetchOrder()
    alert('Payment marked as invalid')
  } catch (e) { 
    console.error('[AdminOrderDetail] Mark payment invalid error:', e);
    alert(e.message || String(e)) 
  }
}

onMounted(() => {
  console.log('[AdminOrderDetail] Component mounted');
  const user = getCurrentUser()
  console.log('[AdminOrderDetail] Current user:', user ? { users_id: user.users_id, role: user.role } : null);
  
  if (!user || user.role !== 'admin') {
    console.log('[AdminOrderDetail] User is not admin, redirecting to home');
    router.push({ name: 'Home' }).catch(() => {})
    return
  }
  fetchOrder()
})
</script>

<style scoped>
img { max-width:100% }
</style>
