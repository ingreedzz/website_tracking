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
          <router-link class="px-4 py-2 bg-gray-200 rounded" to="/payment">Back to payments</router-link>
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

          <div>
            <button @click="submitStatus" class="px-4 py-2 bg-blue-600 text-white rounded">Update Status</button>
            <button @click="reloadOrder" class="ml-2 px-3 py-2 bg-gray-200 rounded">Reload</button>
          </div>
        </div>

        <!-- Order History -->
        <div class="mt-6 p-4 border rounded bg-white">
          <h3 class="font-semibold mb-2">Order History</h3>
          <div v-if="loading">Loading history…</div>
          <div v-else-if="!order.history || order.history.length === 0">No history available.</div>
          <div v-else class="space-y-3">
            <div v-for="h in order.history" :key="h.order_status_history_id" class="p-3 border rounded">
              <div class="text-xs text-gray-500">{{ formatDate(h.created_at) }}</div>
              <div class="mt-1"><strong>By:</strong> {{ h.changed_by_name || h.changed_by_email || h.changed_by }}</div>
              <div class="mt-1"><strong>Transition:</strong> {{ h.old_status || '-' }} → {{ h.new_status }}</div>
              <div v-if="h.note" class="mt-1 text-sm"><strong>Note:</strong> {{ h.note }}</div>
              <div class="mt-1 text-sm text-gray-600">
                <span v-if="h.payment_status"><strong>Payment:</strong> {{ h.payment_status }}</span>
                <span v-if="h.product" class="ml-2"><strong>Product:</strong> {{ h.product }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { apiGet, apiPut } from '../lib/api'

const route = useRoute()
const id = route.params.id
const order = ref(null)
const loading = ref(true)

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
  try {
    if (!newStatus.value) return alert('Please select a new status')
    const payload = {
      status: newStatus.value,
      note: note.value || null,
      expected_current_status: order.value?.status || null,
      force: !!force.value
    }
    if (newPaymentStatus.value) payload.payment_status = newPaymentStatus.value
    // call API helper
    await apiPut(`/server/orders/${id}/status`, payload)
    alert('Order status updated')
    await loadOrder()
    // reset inputs
    newStatus.value = ''
    newPaymentStatus.value = ''
    note.value = ''
    force.value = false
  } catch (e) {
    console.error('[orderDetail] submitStatus error', e)
    alert('Failed to update status: ' + (e.message || e))
  }
}

async function reloadOrder() {
  await loadOrder()
}
</script>
