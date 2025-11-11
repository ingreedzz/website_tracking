<template>
  <section class="dashboard container py-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">Dashboard</h2>
      <div class="space-x-2">
        <button @click="viewMode = 'create'" class="px-3 py-2 bg-blue-500 text-white rounded">Make New Order</button>
        <button @click="viewMode = 'list'" class="px-3 py-2 bg-gray-700 text-white rounded">Show Orders</button>
        <button @click="logout" class="px-3 py-2 bg-red-500 text-white rounded">Log out</button>
      </div>
    </div>

    <!-- Create order -->
    <div v-if="viewMode === 'create'" class="bg-white p-6 rounded shadow">
      <h3 class="font-semibold mb-4">Create Order</h3>
      <form @submit.prevent="handleCreate">
        <div class="grid grid-cols-2 gap-4">
          <label class="block">
            <div class="text-sm">Product</div>
            <input v-model="form.product" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Model</div>
            <select v-model="form.model" class="w-full border rounded px-3 py-2">
              <option v-for="m in modelOptions" :key="m.key" :value="m.key">{{ m.label }}</option>
            </select>
          </label>
          <label class="block">
            <div class="text-sm">Image size (e.g. 1024x768)</div>
            <input v-model="form.size" placeholder="width x height or description" class="w-full border rounded px-3 py-2" />
          </label>
          <!-- dynamic custom fields for selected model -->
          <template v-for="field in getFieldsForModel(form.model)" :key="field.key">
            <label class="block">
              <div class="text-sm">{{ field.label }} <span v-if="field.unit">(cm)</span></div>
              <div class="flex items-center">
                <input :type="field.type === 'number' ? 'number' : 'text'" :step="field.type === 'number' ? '0.1' : undefined" v-model.number="form.custom[field.key]" class="w-full border rounded px-3 py-2" />
                <span v-if="field.unit" class="ml-2 text-sm">{{ field.unit }}</span>
              </div>
            </label>
          </template>
          <label class="block">
            <div class="text-sm">Color</div>
            <input v-model="form.color" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Address</div>
            <input v-model="form.address" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Phone</div>
            <input v-model="form.phone" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Quantity (lusin)</div>
            <input v-model.number="form.quantity" type="number" min="1" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Unit price (per lusin)</div>
            <div class="w-full border rounded px-3 py-2">Rp {{ formatNumber(unitPriceForModel(form.model)) }}</div>
          </label>
          <label class="block">
            <div class="text-sm">Total price</div>
            <div class="w-full border rounded px-3 py-2 font-bold">Rp {{ formatNumber(totalPrice()) }}</div>
          </label>
          <label class="block">
            <div class="text-sm">Order deadline</div>
            <input v-model="form.deadline" type="date" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Sablon image (required)</div>
            <input ref="fileInput" @change="onFileChange" type="file" accept="image/*" class="w-full" required />
          </label>
        </div>

        <div class="mt-4 flex items-center space-x-3">
          <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Next / Submit</button>
          <button type="button" @click="resetForm" class="px-4 py-2 bg-gray-300 rounded">Reset</button>
        </div>
      </form>

      <div v-if="previewUrl" class="mt-4">
        <div class="text-sm mb-2">Preview</div>
        <img :src="previewUrl" alt="preview" class="max-w-xs border" />
      </div>
    </div>

    <!-- Orders list / admin view -->
    <div v-if="viewMode === 'list'" class="mt-6 bg-white p-4 rounded shadow">
      <h3 class="font-semibold mb-4">Orders</h3>
      <div v-if="orders.length === 0">No orders yet.</div>
      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-left border-collapse">
          <thead>
            <tr class="bg-gray-100">
              <th class="p-2 border">Order ID</th>
              <th class="p-2 border">Product</th>
              <th class="p-2 border">Model</th>
              <th class="p-2 border">Size</th>
              <th class="p-2 border">Color</th>
              <th class="p-2 border">Quantity</th>
                  <th class="p-2 border">Status</th>
                  <th class="p-2 border">Unit Price</th>
                  <th class="p-2 border">Total Price</th>
                  <th class="p-2 border">Payment Status</th>
                  <th class="p-2 border">Order Date</th>
                  <th class="p-2 border">Deadline</th>
                  <th class="p-2 border">Sablon</th>
                  <th class="p-2 border">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="o in orders" :key="o.id || o.orders_id">
              <td class="p-2 border">{{ o.id || o.orders_id }}</td>
              <td class="p-2 border">{{ o.product }}</td>
              <td class="p-2 border">{{ o.model }}</td>
              <td class="p-2 border">{{ o.size }}</td>
                  <td class="p-2 border">{{ o.color }}</td>
                  <td class="p-2 border">{{ o.quantity }} lusin</td>
                  <td class="p-2 border">{{ o.status }}</td>
                  <td class="p-2 border">Rp {{ o.unit_price ? Number(o.unit_price).toLocaleString('id-ID') : '-' }}</td>
                  <td class="p-2 border">Rp {{ o.total_price ? Number(o.total_price).toLocaleString('id-ID') : '-' }}</td>
                  <td class="p-2 border">{{ o.payment_status || '-' }}</td>
                  <td class="p-2 border">{{ o.order_date ? new Date(o.order_date).toLocaleDateString() : '-' }}</td>
                  <td class="p-2 border">{{ o.deadline ? new Date(o.deadline).toLocaleDateString() : '-' }}</td>
                  <td class="p-2 border">
                    <div v-if="o.sablon_path || o.sablon_url">
                      <img @click="downloadSablon(o.sablon_path || o.sablon_url)" :src="o.sablon_url ? o.sablon_url : getPublicPreview(o.sablon_path)" class="max-w-[80px] cursor-pointer" />
                    </div>
                    <div v-else>-</div>
                  </td>
                  <td class="p-2 border">
                    <button @click="goToDetail(o.id || o.orders_id)" class="px-2 py-1 bg-blue-500 text-white rounded">View</button>
                  </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script>
import OrderCard from '../components/OrderCard.vue'
import { ref, onMounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { supabase, getProfile } from '../lib/supabase'
import { getCurrentUser, getToken, decodeToken, clearToken, getSupabaseAccessToken } from '../lib/auth'
import { apiGet, apiPostFormData } from '../lib/api'

export default {
  name: 'Dashboard',
  components: { OrderCard },
  setup() {
    const router = useRouter()
    const orders = ref([])
    const loading = ref(false)
    const isAdmin = ref(false)
    const userId = ref(null)
    const viewMode = ref('list')

  const form = reactive({ product: '', model: '', size: '', color: '', address: '', phone: '', quantity: 1, custom: {}, deadline: '' })
    const fileRef = ref(null)
    const previewUrl = ref(null)
    const bucketName = 'sablon-images' // make sure this bucket exists in Supabase Storage

    const publicUrlCache = {}

    // Model options and their custom fields mapping
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

    // default selected model
    // ensure form.model is initialized to a valid model
    if (!form.model) form.model = modelOptions[0].key

    function getFieldsForModel(key) {
      const m = modelOptions.find(x => x.key === key)
      return m ? m.fields : []
    }

    async function load() {
      console.log('[Dashboard] === Loading orders ===');
      loading.value = true
      const payload = getCurrentUser() || decodeToken(getToken())
      if (!payload) {
        console.log('[Dashboard] User not logged in');
        loading.value = false
        return
      }
      console.log('[Dashboard] User payload:', { users_id: payload.users_id, role: payload.role });
      
      // Use users_id from token
      const uid = payload.users_id || null
      if (!uid) {
        console.error('[Dashboard] No users_id in token');
        loading.value = false
        return
      }
      userId.value = uid
      // prefer the role from token; fallback to profiles table
      isAdmin.value = payload.is_admin || payload.role === 'admin'
      console.log('[Dashboard] User role:', { isAdmin: isAdmin.value });

      try {
        // Use different endpoint based on role
        const endpoint = isAdmin.value ? '/orders' : '/user/orders';
        console.log('[Dashboard] Fetching orders from', endpoint);
        
        // Use API helper for authenticated request
        orders.value = await apiGet(endpoint)
        console.log('[Dashboard] Orders loaded:', orders.value.length);
        if (orders.value.length > 0) {
          console.log('[Dashboard] First order sample:', {
            id: orders.value[0].id,
            orders_id: orders.value[0].orders_id,
            product: orders.value[0].product,
            status: orders.value[0].status
          });
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch orders', err)
        console.error('[Dashboard] Error details:', err.message);
        alert(err.message || 'Failed to load orders')
      }
      loading.value = false
      console.log('[Dashboard] === Load complete ===');
    }

    function resetForm() {
      form.product = ''
      form.model = ''
      form.size = ''
      form.color = ''
      form.address = ''
      form.phone = ''
      form.quantity = 1
      fileRef.value = null
      previewUrl.value = null
      // clear file input if present in DOM
      const f = document.querySelector('input[type="file"]')
      if (f) f.value = null
    }

    function onFileChange(e) {
      const f = e.target.files && e.target.files[0]
      if (!f) {
        fileRef.value = null
        previewUrl.value = null
        return
      }
      fileRef.value = f
      previewUrl.value = URL.createObjectURL(f)
    }

    async function handleCreate() {
      console.log('[FRONTEND] === Starting order creation ===');
      try {
        if (!userId.value) {
          console.error('[FRONTEND] User not logged in');
          throw new Error('Not logged in');
        }
        console.log('[FRONTEND] User ID:', userId.value);
        
        // require a sablon image
        if (!fileRef.value) {
          console.error('[FRONTEND] No sablon image selected');
          throw new Error('Sablon image is required');
        }
        console.log('[FRONTEND] Sablon file:', { 
          name: fileRef.value.name, 
          type: fileRef.value.type, 
          size: fileRef.value.size 
        });

        // Build form data
        const fd = new FormData()
        fd.append('product', form.product || '')
        fd.append('model', form.model || '')
        fd.append('size', form.size || '')
        fd.append('color', form.color || '')
        fd.append('address', form.address || '')
        fd.append('phone', form.phone || '')
        fd.append('quantity', String(form.quantity || 1))
        const unitPrice = unitPriceForModel(form.model) || 0
        const total = unitPrice * (Number(form.quantity || 1))
        fd.append('unit_price', String(unitPrice))
        fd.append('total_price', String(total))
        fd.append('order_date', new Date().toISOString())
        if (form.deadline) fd.append('deadline', form.deadline)
        fd.append('payment_method', 'bank')
        fd.append('custom', JSON.stringify(form.custom || {}))
        if (fileRef.value) fd.append('file', fileRef.value)

        console.log('[FRONTEND] Sending POST /server/orders via apiPostFormData...');
        // Use API helper for authenticated request (handles Authorization)
        const json = await apiPostFormData('/server/orders', fd)
        const created = json.order
        if (created) {
          console.log('[FRONTEND] Order created:', { id: created.id, status: created.status });
          orders.value.unshift(created);
          // preload public url for the newly created order's sablon image
          try { await preloadPublicUrls([created]); } catch (e) { 
            console.warn('[FRONTEND] Failed to preload public URL:', e);
          }
        }
        alert('Order created (server upload)');
        // redirect user to payment page for this order so they can upload proof (SPA navigation)
        if (created && (created.id || created.orders_id)) {
          const orderId = created.id || created.orders_id;
          console.log('[FRONTEND] Redirecting to payment page for order:', orderId);
          try {
            await router.push({ name: 'Payment', query: { order: String(orderId) } });
            console.log('[FRONTEND] Navigation to Payment successful');
            return;
          } catch (e) {
            console.warn('[FRONTEND] router.push to Payment failed:', e.message || e);
            console.warn('[FRONTEND] Falling back to list view');
          }
        } else {
          console.warn('[FRONTEND] No valid order ID for navigation, staying on list view');
        }
        viewMode.value = 'list';
        // reset UI
        resetForm();
        console.log('[FRONTEND] === Order creation complete ===');
      } catch (err) {
        console.error('[FRONTEND] === Order creation failed ===');
        console.error('[FRONTEND] Error:', err);
        console.error('[FRONTEND] Error message:', err.message);
        console.error('[FRONTEND] Error stack:', err.stack);
        alert(err.message || String(err));
      }
    }

  function goToDetail(id) { 
    console.log('[goToDetail] Navigating to order detail:', id);
    if (!id) {
      console.error('[goToDetail] No order ID provided');
      return;
    }
    try { 
      router.push({ name: 'OrderDetail', params: { id: String(id) } }) 
    } catch (e) { 
      console.error('[goToDetail] router.push failed', e);
    } 
  }
    function trackOrder(id) { alert('Track order ' + id) }

    async function getPublicPreview(path) {
      if (!path) return null
      if (publicUrlCache[path]) return publicUrlCache[path]
      try {
        // Prefer using Supabase Storage public URL when client is available
        if (supabase && bucketName) {
          try {
            const { data, error } = await supabase.storage.from(bucketName).getPublicUrl(path)
            if (!error && data && data.publicUrl) {
              publicUrlCache[path] = data.publicUrl
              return data.publicUrl
            }
          } catch (e) {
            // continue to fallback below
          }
        }

        // Fallback to building a URL from VITE_API_URL (if provided)
        if (import.meta.env.VITE_API_URL) {
          const url = `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}${path}`
          publicUrlCache[path] = url
          return url
        }

        return null
      } catch (err) {
        console.warn('[getPublicPreview] fallback for', path, err)
        return null
      }
    }

    function unitPriceForModel(key) {
      const priceMap = {
        SetelanAnakPria: 32000,
        SetelanAnakWanita: 30000,
        KaosOblongDewasa: 28000,
        JaketHoodie: 29000,
        SeragamOlahraga: 31000
      }
      return priceMap[key] || 0
    }

    function totalPrice() {
      const qty = Number(form.quantity || 0)
      return unitPriceForModel(form.model) * qty
    }

    function formatNumber(n) {
      try { return Number(n).toLocaleString('id-ID') } catch (e) { return String(n) }
    }

    // helper used in template (sync) — returns cached public url or placeholder
    function getPublicPreviewSync(path) {
      return publicUrlCache[path] || ''
    }

    // download sablon: will open in new tab or download blob
    async function downloadSablon(pathOrUrl) {
      try {
        if (!pathOrUrl) return
        // if it's already a full URL, open it directly
        if (typeof pathOrUrl === 'string' && (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://'))) {
          window.open(pathOrUrl, '_blank')
          return
        }
        const path = pathOrUrl
        // Prefer Supabase public URL if possible
        if (supabase && bucketName) {
          try {
            const { data, error } = await supabase.storage.from(bucketName).getPublicUrl(path)
            if (!error && data && data.publicUrl) {
              window.open(data.publicUrl, '_blank')
              return
            }
          } catch (e) {
            // ignore and fallback below
          }
        }

        // Fallback to VITE_API_URL-based URL
        const pubUrl = `${(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}${path}`
        window.open(pubUrl, '_blank')
      } catch (err) {
        console.error('[downloadSablon] error', err)
        alert('Failed to download image: ' + (err.message || err))
      }
    }

    async function logout() {
      clearToken()
      try { await router.push({ name: 'Home' }) } catch (e) { console.warn('[logout] router.push failed', e) }
    }

    // small initialization: preload public urls for existing orders
    async function preloadPublicUrls(list) {
      for (const o of list) {
        if (o.sablon_path) {
          try {
            if (o.sablon_url) {
              publicUrlCache[o.sablon_path] = o.sablon_url || ''
              continue
            }
            const { data } = await supabase.storage.from(bucketName).getPublicUrl(o.sablon_path)
            publicUrlCache[o.sablon_path] = data?.publicUrl || ''
          } catch (e) { /* ignore */ }
        }
      }
    }

    onMounted(async () => {
      await load()
      await preloadPublicUrls(orders.value)
    })

    // template needs a sync getter for preview src — use computed-style helper
    return {
      orders,
      loading,
      isAdmin,
      goToDetail,
      trackOrder,
      handleCreate,
      createOrder: handleCreate,
      viewMode,
      form,
      onFileChange,
      resetForm,
      previewUrl,
      downloadSablon,
      getPublicPreview: getPublicPreviewSync,
      modelOptions,
      getFieldsForModel,
      unitPriceForModel,
      totalPrice,
      formatNumber,
      logout
    }
  }
}
</script>

<style scoped>
.dashboard { padding: 1rem }
</style>
