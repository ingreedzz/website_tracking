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
import { getCurrentUser } from '../lib/auth'

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
  try {
    const resp = await fetch('/api/orders/' + id)
    if (!resp.ok) throw new Error('Failed to load order')
    const data = await resp.json()
    order.value = data
  selectedStatus.value = data.status || 'created'
  // order_items may be embedded as an array by the API
  const item = (data.order_items && data.order_items.length) ? data.order_items[0] : (data.item || null)
  if (item && item.product_snapshot) itemSnapshot.value = item.product_snapshot
    // fetch address (order_addresses) — simple query
    try {
      const a = await fetch('/api/order_addresses?order_id=eq.' + id)
      if (a.ok) {
        const arr = await a.json()
        address.value = Array.isArray(arr) && arr.length ? arr[0] : {}
      }
    } catch (e) {}
    // try to fetch payment row
    try {
      const p = await fetch('/api/payments?order_id=eq.' + id)
      if (p.ok) { const arr = await p.json(); payment.value = Array.isArray(arr) && arr.length ? arr[0] : null }
    } catch (e) {}
    // build sablon public url if item includes sablon_path
  if (item && item.sablon_path) {
      try {
        const pu = await fetch('/api/signed-url?sablon=' + encodeURIComponent(data.item.sablon_path))
        // fallback: use relative public url
      } catch (e) {}
      sablonUrl.value = data.sablon_url || (item && item.sablon_path ? '/storage/' + item.sablon_path : '')
    }
  } catch (e) {
    console.error('[admin] fetchOrder', e)
  }
}

function goBack() { router.push({ name: 'AdminDashboard' }).catch(() => {}) }

async function updateStatus() {
  try {
    const token = getCurrentUser() && localStorage.getItem('token')
    const resp = await fetch('/api/server/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status: selectedStatus.value })
    })
    if (!resp.ok) { const t = await resp.text(); throw new Error(t || 'Failed to update') }
    await fetchOrder()
    alert('Status updated')
  } catch (e) { alert(e.message || String(e)) }
}

async function markPaymentValid() {
  try {
    const token = getCurrentUser() && localStorage.getItem('token')
    const resp = await fetch('/api/server/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status: 'processing', payment_status: 'confirmed', note: 'Payment validated by admin' })
    })
    if (!resp.ok) throw new Error('Failed to mark payment valid')
    await fetchOrder()
    alert('Payment marked as valid')
  } catch (e) { alert(e.message || String(e)) }
}

async function markPaymentInvalid() {
  try {
    const token = getCurrentUser() && localStorage.getItem('token')
    const resp = await fetch('/api/server/orders/' + id + '/status', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ status: 'cancelled', payment_status: 'invalid', note: 'Payment marked invalid' })
    })
    if (!resp.ok) throw new Error('Failed to mark payment invalid')
    await fetchOrder()
    alert('Payment marked as invalid')
  } catch (e) { alert(e.message || String(e)) }
}

onMounted(() => {
  const user = getCurrentUser()
  if (!user || user.role !== 'admin') {
    router.push({ name: 'Home' }).catch(() => {})
    return
  }
  fetchOrder()
})
</script>

<style scoped>
img { max-width:100% }
</style>
