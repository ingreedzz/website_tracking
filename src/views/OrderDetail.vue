<template>
  <section class="container py-6">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 class="text-xl font-bold mb-4">Order Detail — #{{ id }}</h2>

      <div v-if="loading">Loading…</div>
      <div v-else-if="!order">Order not found.</div>
      <div v-else>
        <div class="mb-3"><strong>Product:</strong> {{ order.product || '-' }}</div>
        <div class="mb-3"><strong>Model / Size / Color:</strong> {{ order.model || '-' }} / {{ order.size || '-' }} / {{ order.color || '-' }}</div>

        <!-- dynamic model-specific custom fields -->
        <div v-if="modelFields.length" class="mb-3">
          <strong>Measurements / Options for {{ order.model }}:</strong>
          <div class="mt-2 space-y-2">
            <div v-for="f in modelFields" :key="f.key" class="text-sm">
              <span class="font-medium">{{ f.label }}:</span>
              <span class="ml-2">{{ displayCustomValue(f) }}</span>
              <span v-if="f.unit" class="ml-1 text-gray-600">{{ f.unit }}</span>
            </div>
          </div>
        </div>
        <div class="mb-3"><strong>Quantity:</strong> {{ order.quantity || '-' }}</div>
        <div class="mb-3"><strong>Unit price:</strong> {{ formatMoney(order.unit_price) }}</div>
        <div class="mb-3"><strong>Total price:</strong> {{ formatMoney(order.total_price || order.total) }}</div>
        <div class="mb-3"><strong>Order date:</strong> {{ formatDate(order.order_date) }}</div>
        <div class="mb-3"><strong>Deadline:</strong> {{ order.deadline || '-' }}</div>
        <div class="mb-3"><strong>Payment status:</strong> <span :class="paymentClass">{{ order.payment_status || 'not submitted' }}</span></div>
        <div v-if="order.payment_proof_url || order.payment_proof_path" class="mb-3">
          <strong>Payment proof:</strong>
          <div class="mt-2">
            <a :href="order.payment_proof_url || order.payment_proof_path" target="_blank" class="text-blue-600 underline">Open proof image</a>
          </div>
        </div>
        <div class="mt-4">
          <router-link class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" to="/dashboard">Back to Dashboard</router-link>
        </div>

        <!-- Status update form (available to any authenticated user) -->
        <div class="mt-6 p-4 border rounded bg-gray-50">
          <h3 class="font-semibold mb-2">Update Order Status</h3>
          <div class="mb-2">
            <label class="block text-sm font-medium">New status</label>
            <select v-model="newStatus" class="mt-1 block w-full border rounded p-2">
              <option value="created">created</option>
              <option value="confirmed">confirmed</option>
              <option value="printing">printing</option>
              <option value="shipped">shipped</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div class="mb-2">
            <label class="block text-sm font-medium">Payment status (optional)</label>
            <select v-model="newPaymentStatus" class="mt-1 block w-full border rounded p-2">
              <option value="">(no change)</option>
              <option value="pending">pending</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="refunded">refunded</option>
            </select>
          </div>

          <div class="mb-2">
            <label class="block text-sm font-medium">Note (optional)</label>
            <input v-model="note" class="mt-1 block w-full border rounded p-2" type="text" />
          </div>

          <div class="mb-4">
            <label class="inline-flex items-center">
              <input type="checkbox" v-model="force" class="mr-2" />
              <span class="text-sm">Force transition (skip validation)</span>
            </label>
          </div>

          <div class="flex space-x-2">
            <button @click="submitStatus" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Update Status</button>
            <button @click="reloadOrder" class="px-3 py-2 bg-gray-300 rounded hover:bg-gray-400">Reload</button>
          </div>
        </div>

        <!-- Delete Order Section -->
        <div class="mt-6 p-4 border border-red-300 rounded bg-red-50">
          <h3 class="font-semibold mb-2 text-red-700">Danger Zone</h3>
          <p class="text-sm text-gray-700 mb-3">Once you delete an order, there is no going back. Please be certain.</p>
          <button @click="deleteOrder" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Delete Order</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiGet, apiPut } from '../lib/api'

const route = useRoute()
const router = useRouter()
const id = route.params.id
const order = ref(null)
const loading = ref(true)

console.log('[OrderDetail] Component mounted, order ID:', id);

function formatMoney(v) {
  try {
    return v ? Number(v).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : '-'
  } catch (e) { return String(v || '-') }
}

function formatDate(d) {
  if (!d) return '-'
  try { return new Date(d).toLocaleString() } catch (e) { return String(d) }
}

const paymentClass = computed(() => {
  const s = order.value?.payment_status
  if (s === 'paid') return 'text-green-600 font-semibold'
  if (s === 'pending') return 'text-yellow-600 font-semibold'
  if (s === 'failed' || s === 'cancelled') return 'text-red-600 font-semibold'
  return 'text-gray-700'
})

// model options and fields mapping (same as Dashboard)
const modelOptions = [
  { key: 'SetelanAnakPria', label: 'Setelan Anak Pria', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
    { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' }
  ] },
  { key: 'SetelanAnakWanita', label: 'Setelan Anak Wanita', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
    { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' }
  ] },
  { key: 'KaosOblongDewasa', label: 'Kaos Oblong Dewasa', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' }
  ] },
  { key: 'JaketHoodie', label: 'Jaket / Hoodie', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' },
    { key: 'ukuran_hoodie', label: 'Ukuran Hoodie', type: 'text', unit: '' }
  ] },
  { key: 'SeragamOlahraga', label: 'Seragam Olahraga', fields: [
    { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
    { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
    { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' }
  ] }
]

const modelFields = computed(() => {
  const key = order.value?.model
  if (!key) return []
  const m = modelOptions.find(x => x.key === key)
  return m ? m.fields : []
})

function displayCustomValue(field) {
  try {
    let v = order.value?.custom ? order.value.custom[field.key] : undefined
    // sometimes `custom` may be stored as a JSON string; try to parse
    if (typeof v === 'string') {
      const s = v.trim()
      if ((s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))) {
        try { v = JSON.parse(s) } catch (e) { /* keep string if parse fails */ }
      }
    }
    if (v === undefined || v === null || v === '') return '-'
    return field.type === 'number' ? String(v) : String(v)
  } catch (e) { return '-' }
}

async function loadOrder() {
  loading.value = true
  try {
    // Use API helper for authenticated request
    const data = await apiGet(`/orders/${id}`)
    order.value = data
    console.log('[orderDetail] loaded order', order.value?.id, 'historyCount=', order.value?.history?.length || 0)
  } catch (e) {
    console.error('[orderDetail] load error', e)
    order.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => loadOrder())

// status update state
const newStatus = ref('')
const newPaymentStatus = ref('')
const note = ref('')
const force = ref(false)

async function submitStatus() {
  console.log('[OrderDetail] === Submitting status update ===');
  console.log('[OrderDetail] Timestamp:', new Date().toISOString());
  console.log('[OrderDetail] Order ID:', id);
  console.log('[OrderDetail] New status:', newStatus.value);
  console.log('[OrderDetail] Payment status:', newPaymentStatus.value || '(not changing)');
  console.log('[OrderDetail] Note:', note.value || '(none)');
  console.log('[OrderDetail] Force:', force.value);
  
  try {
    if (!newStatus.value) {
      console.error('[OrderDetail] No status selected');
      return alert('Please select a new status');
    }
    
    const payload = {
      status: newStatus.value,
      note: note.value || null,
      expected_current_status: order.value?.status || null,
      force: !!force.value
    }
    if (newPaymentStatus.value) payload.payment_status = newPaymentStatus.value
    
    console.log('[OrderDetail] Payload:', payload);
    console.log('[OrderDetail] Calling API PUT /server/orders/:id/status');
    
    // call API helper
    await apiPut(`/server/orders/${id}/status`, payload)
    
    console.log('[OrderDetail] ✓ Status update successful');
    alert('Order status updated')
    
    console.log('[OrderDetail] Reloading order data...');
    await loadOrder()
    
    // reset inputs
    newStatus.value = ''
    newPaymentStatus.value = ''
    note.value = ''
    force.value = false
    
    console.log('[OrderDetail] === Status update complete ===');
  } catch (e) {
    console.error('[OrderDetail] === Status update failed ===');
    console.error('[OrderDetail] Error:', e);
    console.error('[OrderDetail] Error message:', e.message);
    alert('Failed to update status: ' + (e.message || e))
  }
}

async function reloadOrder() {
  console.log('[OrderDetail] Reloading order...');
  await loadOrder()
}

async function deleteOrder() {
  console.log('[OrderDetail] === Attempting to delete order ===');
  console.log('[OrderDetail] Timestamp:', new Date().toISOString());
  console.log('[OrderDetail] Order ID:', id);
  
  if (!confirm('Are you sure you want to delete this order? This action cannot be undone.')) {
    console.log('[OrderDetail] Delete cancelled by user');
    return;
  }
  
  try {
    console.log('[OrderDetail] Calling API DELETE /server/orders/:id');
    const response = await fetch(`/api/server/orders/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('[OrderDetail] Delete response status:', response.status);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('[OrderDetail] Delete failed:', error);
      throw new Error(error.error || `Delete failed with status ${response.status}`);
    }
    
    const result = await response.json();
    console.log('[OrderDetail] ✓ Order deleted successfully:', result);
    
    alert('Order deleted successfully');
    console.log('[OrderDetail] Navigating to dashboard...');
    router.push({ name: 'Dashboard' });
    console.log('[OrderDetail] === Delete complete ===');
  } catch (e) {
    console.error('[OrderDetail] === Delete failed ===');
    console.error('[OrderDetail] Error:', e);
    console.error('[OrderDetail] Error message:', e.message);
    alert('Failed to delete order: ' + (e.message || e));
  }
}
</script>
