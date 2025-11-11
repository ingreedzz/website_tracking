<template>
  <section class="container py-6">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded shadow">
      <h2 class="text-xl font-bold mb-4">Payment</h2>

          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div class="text-sm font-semibold mb-2">Payment Method</div>
              <select v-model="method" class="w-full border rounded px-3 py-2">
                <option value="bank">Bank Transfer</option>
              </select>
            </div>
            <div>
              <div class="text-sm font-semibold mb-2">Bank Details (transfer to)</div>
              <div class="w-full border rounded px-3 py-2 bg-gray-50">
                <div class="font-semibold">{{ STORE_BANK.name }} • {{ STORE_BANK.account_number }}</div>
                <div class="text-sm text-gray-600">Account owner: {{ STORE_BANK.owner_name }}</div>
              </div>
            </div>
          </div>

      <div class="mb-4">
        <div class="text-sm font-semibold mb-2">Attach payment proof to order</div>
        <select v-model="orderId" class="w-full border rounded px-3 py-2">
          <option value="">-- Select order --</option>
          <option v-for="o in orders" :key="o.id" :value="o.id">
            Order #{{ o.id?.substring(0, 8) }} — {{ formatOrderDisplay(o) }} — Rp {{ formatPrice(o.total_price) }}
            <span v-if="o.payment_status === 'paid'"> — ✓ PAID</span>
            <span v-else-if="o.payment_proof_path || o.payment_proof_url"> — ⏳ Pending</span>
          </option>
        </select>
      </div>

      <div class="mb-4">
        <div class="text-sm font-semibold mb-2">Payment Proof (image)</div>
        <input type="file" accept="image/*" @change="onFileChange" />
        <div v-if="previewUrl" class="mt-3">
          <div class="text-sm mb-1">Preview</div>
          <img :src="previewUrl" class="max-w-xs border" />
        </div>
      </div>

      <div class="mb-4">
        <div class="text-sm font-semibold mb-2">Payment Note</div>
        <textarea v-model="note" class="w-full border rounded px-3 py-2" rows="4"></textarea>
      </div>

      <div class="mb-4">
        <div class="flex items-center justify-between">
          <div class="text-lg font-semibold">Total Price</div>
          <div class="text-lg font-bold">{{ formattedSelectedTotal }}</div>
        </div>
        <div class="mt-2">
          <div class="text-sm">Payment status: <span :class="statusClass">{{ selectedOrder?.payment_status || 'not submitted' }}</span></div>
          <div v-if="selectedOrder?.payment_proof_url || selectedOrder?.payment_proof_path" class="text-sm mt-1">
            Proof: <a :href="paymentProofUrl" target="_blank" class="text-blue-600 underline">Open proof</a>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-3">
  <button @click="submitPayment" :disabled="uploading || !orderId || (selectedOrder && (selectedOrder.payment_status === 'paid' || selectedOrder.payment_proof_path || selectedOrder.payment_proof_url))" class="px-4 py-2 bg-green-600 text-white rounded">
          <span v-if="!uploading">Upload Proof</span>
          <span v-else>Uploading...</span>
        </button>
        <button @click="resetForm" class="px-4 py-2 bg-gray-300 rounded">Reset</button>
      </div>

      <div v-if="uploadedUrl" class="mt-4">
        <div class="text-sm font-semibold mb-2">Uploaded Proof</div>
        <a :href="uploadedUrl" target="_blank" class="text-blue-600 underline">Open uploaded image</a>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '../lib/supabase'
import { getToken, getCurrentUser, decodeToken } from '../lib/auth'
import { apiGet } from '../lib/api'

// payment page constants (store bank details) — change to your real store info
const STORE_BANK = {
  name: 'BCA',
  account_number: '1234567890',
  owner_name: 'Sablon Servis'
}

const method = ref('bank')
const file = ref(null)
const previewUrl = ref(null)
const note = ref('')
const uploading = ref(false)
const uploadedUrl = ref('')
const orders = ref([])
const orderId = ref('')
const route = useRoute()

const selectedOrder = computed(() => {
  if (!orderId.value) return null
  return orders.value.find(o => String(o.id) === String(orderId.value)) || null
})

const formattedSelectedTotal = computed(() => {
  const o = selectedOrder.value
  const v = o?.total_price ?? o?.total ?? 0
  try {
    return v ? Number(v).toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) : '-'
  } catch (e) { return String(v) }
})

const statusClass = computed(() => {
  const s = (selectedOrder.value && selectedOrder.value.payment_status) || ''
  if (s === 'paid') return 'text-green-600 font-semibold'
  if (s === 'pending') return 'text-yellow-600 font-semibold'
  if (s === 'failed' || s === 'cancelled') return 'text-red-600 font-semibold'
  return 'text-gray-700'
})

const paymentProofUrl = computed(() => {
  const o = selectedOrder.value
  return o?.payment_proof_url || o?.payment_proof_path || ''
})

function formatOrderDisplay(order) {
  // Format order details for display in dropdown
  if (!order) return 'Unknown Order';
  
  const parts = [];
  
  // Add product name (primary identifier)
  if (order.product && order.product !== 'Unknown Product') {
    parts.push(order.product);
  }
  
  // Add model if different from product
  if (order.model && order.model !== 'N/A' && order.model !== order.product) {
    parts.push(order.model);
  }
  
  // Add quantity if available
  if (order.quantity && order.quantity > 0) {
    parts.push(`${order.quantity} pcs`);
  }
  
  // If no meaningful data, show order ID
  if (parts.length === 0) {
    return `Order ${order.id?.substring(0, 8) || 'Unknown'}`;
  }
  
  return parts.join(' • ');
}

function formatPrice(price) {
  // Format price in Indonesian Rupiah format
  if (!price || isNaN(price)) return '0';
  
  try {
    return Number(price).toLocaleString('id-ID');
  } catch (e) {
    return String(price);
  }
}

function onFileChange(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) {
    file.value = null
    previewUrl.value = null
    return
  }
  // basic client-side validation
  if (!['image/png','image/jpeg','image/webp','image/gif'].includes(f.type)) {
    alert('Only PNG/JPEG/WebP/GIF images are allowed')
    e.target.value = null
    return
  }
  if (f.size > 5 * 1024 * 1024) {
    alert('Max file size is 5 MB')
    e.target.value = null
    return
  }
  file.value = f
  previewUrl.value = URL.createObjectURL(f)
}

async function submitPayment() {
  console.log('[PAYMENT] === Starting payment proof upload ===');
  try {
    uploading.value = true
    const token = getToken()
    if (!token) {
      console.error('[PAYMENT] No auth token found');
      throw new Error('You must be logged in to submit payment proof');
    }
    
    if (!file.value) {
      console.error('[PAYMENT] No file selected');
      throw new Error('Please choose an image file to upload');
    }
    
    if (!orderId.value) {
      console.error('[PAYMENT] No order selected');
      throw new Error('Please select an order to attach this proof to');
    }
    
    // prevent double submissions for already-paid orders
    if (selectedOrder.value && (selectedOrder.value.payment_status === 'paid' || selectedOrder.value.payment_proof_path || selectedOrder.value.payment_proof_url)) {
      console.error('[PAYMENT] Order already has payment proof');
      throw new Error('This order already has a payment proof or is marked paid');
    }
    
    console.log('[PAYMENT] Preparing form data...');
    console.log('[PAYMENT]   Order ID:', orderId.value);
    console.log('[PAYMENT]   File name:', file.value.name);
    console.log('[PAYMENT]   File size:', file.value.size);
    console.log('[PAYMENT]   Payment method:', method.value);

    // send the file to server endpoint which will upload and update the order row
    const fd = new FormData()
    fd.append('file', file.value)
    fd.append('payment_method', method.value || 'bank')
    
    // Include amount from selected order
    if (selectedOrder.value && selectedOrder.value.total_price) {
      fd.append('amount', selectedOrder.value.total_price)
      console.log('[PAYMENT]   Amount:', selectedOrder.value.total_price);
    }
    
    if (note.value) {
      fd.append('notes', note.value)
      console.log('[PAYMENT]   Notes:', note.value);
    }

    console.log('[PAYMENT] Sending POST /server/orders/:id/payment...');
    const resp = await fetch(`/api/server/orders/${orderId.value}/payment`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: fd
    })
    
    console.log('[PAYMENT] Response status:', resp.status);
    
    if (!resp.ok) {
      let eb = null
      try { eb = await resp.json() } catch (e) {}
      console.error('[PAYMENT] Upload failed:', eb);
      throw new Error((eb && eb.error) ? eb.error : 'Upload failed: ' + resp.status)
    }
    
    const json = await resp.json()
    console.log('[PAYMENT] Upload successful:', json);
    
    uploadedUrl.value = json.order?.payment_proof_url || json.order?.payment_proof_path || ''
    console.log('[PAYMENT] Payment proof URL:', uploadedUrl.value);
    
    // refresh order list
    console.log('[PAYMENT] Refreshing order list...');
    await loadOrders()
    
    console.log('[PAYMENT] === Payment proof upload complete ===');
    alert('Payment proof uploaded and attached to order')
  } catch (err) {
    console.error('[PAYMENT] === Upload error ===');
    console.error('[PAYMENT] Error:', err);
    console.error('[PAYMENT] Error message:', err.message);
    alert(err.message || String(err))
  } finally {
    uploading.value = false
  }
}

async function loadOrders() {
  console.log('[PAYMENT] === Loading orders ===');
  try {
    const token = getToken()
    if (!token) {
      console.log('[PAYMENT] No auth token, skipping load');
      return;
    }
    
    // Determine user role to use correct endpoint
    const user = getCurrentUser() || decodeToken(token);
    const isAdmin = user?.is_admin || user?.role === 'admin';
    const endpoint = isAdmin ? '/orders' : '/user/orders';
    
    console.log('[PAYMENT] User role:', { isAdmin: isAdmin });
    console.log('[PAYMENT] Using endpoint:', endpoint);
    
    // Use API helper for authenticated request with error handling
    let data;
    try {
      data = await apiGet(endpoint);
    } catch (apiErr) {
      console.error('[PAYMENT] API request failed');
      console.error('[PAYMENT] Error:', apiErr.message);
      
      // Provide user-friendly error messages
      if (apiErr.message.includes('502')) {
        console.error('[PAYMENT] Server returned 502 - Bad Gateway');
        console.error('[PAYMENT] This usually means the backend server is down or unreachable');
      } else if (apiErr.message.includes('504')) {
        console.error('[PAYMENT] Server returned 504 - Gateway Timeout');
      }
      
      throw apiErr; // Re-throw for outer catch
    }
    
    orders.value = data || []
    
    console.log('[PAYMENT] Orders loaded:', orders.value.length);
    if (orders.value.length > 0) {
      console.log('[PAYMENT] First order sample:', {
        id: orders.value[0].id,
        product: orders.value[0].product,
        model: orders.value[0].model,
        total_price: orders.value[0].total_price,
        payment_status: orders.value[0].payment_status
      });
      
      // Log any orders with missing product info
      const missingProduct = orders.value.filter(o => !o.product || o.product === 'Unknown Product');
      if (missingProduct.length > 0) {
        console.warn('[PAYMENT] ⚠️', missingProduct.length, 'orders have missing product information');
        console.warn('[PAYMENT] Sample order with missing info:', missingProduct[0]);
      }
    }
  } catch (e) {
    console.error('[PAYMENT] === Load orders error ===');
    console.error('[PAYMENT] Error name:', e.name);
    console.error('[PAYMENT] Error message:', e.message);
    if (e.stack) {
      console.error('[PAYMENT] Error stack:', e.stack);
    }
    orders.value = []
  }
  console.log('[PAYMENT] === Load complete ===');
}

function resetForm() {
  method.value = 'bank'
  file.value = null
  previewUrl.value = null
  note.value = ''
  uploadedUrl.value = ''
}

onMounted(() => {
  console.log('[PAYMENT] Component mounted');
  // preload orders and pick order from query if present
  loadOrders()
  const q = route.query?.order || route.query?.id
  if (q) {
    orderId.value = String(q)
    console.log('[PAYMENT] Pre-selected order from query:', orderId.value);
  }
})
</script>

<style scoped>
.container { padding: 1rem }
</style>
