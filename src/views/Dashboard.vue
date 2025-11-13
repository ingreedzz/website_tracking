<template>
  <section class="dashboard container py-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">Dashboard</h2>
      <div class="space-x-2">
        <button @click="viewMode = 'create'" class="px-3 py-2 bg-blue-500 text-white rounded">Make New Order</button>
        <button @click="viewMode = 'list'" class="px-3 py-2 bg-gray-700 text-white rounded">Show Orders</button>
        <button v-if="isAdmin" @click="viewMode = 'createModel'" class="px-3 py-2 bg-green-600 text-white rounded">Create Model</button>
        <button @click="logout" class="px-3 py-2 bg-red-500 text-white rounded">Log out</button>
      </div>
    </div>

    <!-- Create Model (Admin Only) -->
    <div v-if="viewMode === 'createModel' && isAdmin" class="mb-6 bg-white border-2 border-gray-300 p-6 rounded-lg shadow-md">
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
        <button @click="viewMode = 'list'" type="button" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>

      <!-- Status Message -->
      <div v-if="modelCreateMsg" :class="{'text-green-600': modelCreateMsg.includes('success'), 'text-red-600': !modelCreateMsg.includes('success')}" class="mt-3 text-sm font-medium">
        {{ modelCreateMsg }}
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
            <div class="text-sm">Customer Name</div>
            <input v-model="form.customer_name" placeholder="e.g., John Doe" class="w-full border rounded px-3 py-2" />
          </label>
          <label class="block">
            <div class="text-sm">Order Name</div>
            <input v-model="form.order_name" placeholder="e.g., School Uniform Batch 1" class="w-full border rounded px-3 py-2" />
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
              <th class="p-2 border">Order Name</th>
              <th class="p-2 border">Customer Name</th>
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
              <td class="p-2 border">{{ o.order_name || 'Unknown' }}</td>
              <td class="p-2 border">{{ o.customer_name || 'Unknown' }}</td>
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
import { apiGet, apiPostFormData, apiPost } from '../lib/api'

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

  const form = reactive({ product: '', model: '', size: '', color: '', address: '', phone: '', quantity: 1, custom: {}, deadline: '', customer_name: '', order_name: '' })
    const fileRef = ref(null)
    const previewUrl = ref(null)
    const bucketName = 'sablon-images' // make sure this bucket exists in Supabase Storage

    const publicUrlCache = {}

    // Model creation state
    const newModel = ref({ 
      name: '', 
      description: '', 
      size_fields: [] 
    })
    const modelCreateMsg = ref('')

    // Model options - will be fetched from backend or use fallback
    const modelOptions = ref([])
    
    // Fallback model options with hardcoded fields (used if backend doesn't have models or size_fields)
    const fallbackModelOptions = [
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

    // Load models from backend
    async function loadModels() {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] === Loading models from backend ===');
      console.log('[Dashboard] Timestamp:', new Date().toISOString());
      
      try {
        // Step 1: Fetch models from API
        console.log('[Dashboard] Step 1: Calling GET /models API');
        const models = await apiGet('/models');
        
        console.log('[Dashboard] ✓ API response received');
        console.log('[Dashboard] Models count:', models ? models.length : 0);
        console.log('[Dashboard] Models type:', typeof models);
        console.log('[Dashboard] Is array:', Array.isArray(models));
        
        // Step 2: Process models
        if (models && models.length > 0) {
          console.log('[Dashboard] Step 2: Processing models...');
          
          // Convert backend models to frontend format
          modelOptions.value = models.map((m, idx) => {
            console.log(`[Dashboard] Processing model ${idx + 1}:`, {
              models_id: m.models_id,
              name: m.name,
              has_size_fields: !!(m.size_fields && Array.isArray(m.size_fields)),
              size_fields_count: Array.isArray(m.size_fields) ? m.size_fields.length : 0
            });
            
            // If model has size_fields from DB, use them
            if (m.size_fields && Array.isArray(m.size_fields) && m.size_fields.length > 0) {
              console.log(`[Dashboard] Model ${idx + 1} has dynamic size_fields from database:`, m.size_fields.length);
              
              const fields = m.size_fields.map(f => ({
                key: f.key || f.name || '',
                label: f.label || f.name || '',
                type: f.type || 'text',
                unit: f.unit || ''
              }));
              
              console.log(`[Dashboard] Converted fields for model ${idx + 1}:`, fields.map(f => f.key));
              
              return {
                key: m.name || m.models_id,
                label: m.name || 'Unknown Model',
                fields: fields
              };
            } else {
              // No size_fields, try to match with fallback
              console.log(`[Dashboard] Model ${idx + 1} has no size_fields, checking fallback...`);
              const fallback = fallbackModelOptions.find(fm => fm.key === m.name || fm.label === m.name);
              
              if (fallback) {
                console.log(`[Dashboard] ✓ Found fallback match for "${m.name}":`, fallback.fields.length, 'fields');
              } else {
                console.log(`[Dashboard] ⚠️  No fallback match for "${m.name}", using empty fields`);
              }
              
              return {
                key: m.name || m.models_id,
                label: m.name || 'Unknown Model',
                fields: fallback ? fallback.fields : []
              };
            }
          });
          
          console.log('[Dashboard] ✓ Models converted:', modelOptions.value.length);
          console.log('[Dashboard] Model keys:', modelOptions.value.map(m => m.key));
          console.log('[Dashboard] Models with dynamic fields:', modelOptions.value.filter(m => m.fields.length > 0).length);
        } else {
          console.warn('[Dashboard] ⚠️  No models returned from backend');
          console.warn('[Dashboard] Using fallback hardcoded models');
          modelOptions.value = fallbackModelOptions;
          console.log('[Dashboard] Fallback models count:', modelOptions.value.length);
        }
        
        // Step 3: Initialize form.model
        console.log('[Dashboard] Step 3: Initializing form.model');
        if (!form.model && modelOptions.value.length > 0) {
          form.model = modelOptions.value[0].key;
          console.log('[Dashboard] ✓ Set initial model to:', form.model);
        } else if (form.model) {
          console.log('[Dashboard] form.model already set to:', form.model);
        } else {
          console.error('[Dashboard] ❌ No models available to initialize');
        }
        
        console.log('[Dashboard] === Models loaded successfully ===');
        console.log('[Dashboard] Summary:');
        console.log('[Dashboard]   Total models:', modelOptions.value.length);
        console.log('[Dashboard]   Using dynamic size_fields:', modelOptions.value.filter(m => m.fields.length > 0).length);
        console.log('[Dashboard]   Current selected model:', form.model);
        console.log('[Dashboard] ========================================');
      } catch (err) {
        console.error('[Dashboard] ========================================');
        console.error('[Dashboard] ❌ Failed to load models from backend');
        console.error('[Dashboard] Error name:', err.name);
        console.error('[Dashboard] Error message:', err.message);
        console.error('[Dashboard] Error stack:', err.stack);
        console.error('[Dashboard] Full error:', err);
        console.error('[Dashboard] Using fallback hardcoded models');
        
        modelOptions.value = fallbackModelOptions;
        
        console.error('[Dashboard] Fallback models count:', modelOptions.value.length);
        console.error('[Dashboard] === Model loading failed (using fallback) ===');
        console.error('[Dashboard] ========================================');
      }
      
      // Ensure form.model is initialized to a valid model
      if (!form.model && modelOptions.value.length > 0) {
        form.model = modelOptions.value[0].key;
        console.log('[Dashboard] Final fallback: Set model to:', form.model);
      }
    }

    function getFieldsForModel(key) {
      console.log('[Dashboard] getFieldsForModel called for:', key);
      const m = modelOptions.value.find(x => x.key === key);
      
      if (m) {
        console.log('[Dashboard] ✓ Found model:', m.label);
        console.log('[Dashboard] Fields count:', m.fields ? m.fields.length : 0);
        if (m.fields && m.fields.length > 0) {
          console.log('[Dashboard] Field keys:', m.fields.map(f => f.key));
        } else {
          console.log('[Dashboard] ⚠️  No fields for this model');
        }
        return m.fields || [];
      } else {
        console.warn('[Dashboard] ⚠️  Model not found:', key);
        console.warn('[Dashboard] Available models:', modelOptions.value.map(x => x.key));
        return [];
      }
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
      console.log('[Dashboard] User payload:', { users_id: payload.users_id, is_admin: payload.is_admin });
      
      // Use users_id from token
      const uid = payload.users_id || null
      if (!uid) {
        console.error('[Dashboard] No users_id in token');
        loading.value = false
        return
      }
      userId.value = uid
      // prefer the is_admin flag from token
      isAdmin.value = !!payload.is_admin
      console.log('[Dashboard] User is_admin:', isAdmin.value);

      try {
        // Use different endpoint based on role
        const endpoint = isAdmin.value ? '/orders' : '/user/orders';
        console.log('[Dashboard] Fetching orders from', endpoint);
        
        // Use API helper for authenticated request
        let orderData;
        try {
          orderData = await apiGet(endpoint);
        } catch (apiErr) {
          console.error('[Dashboard] API request failed');
          console.error('[Dashboard] Error name:', apiErr.name);
          console.error('[Dashboard] Error message:', apiErr.message);
          
          // Provide user-friendly error messages based on error type
          if (apiErr.message.includes('502')) {
            throw new Error('Server is temporarily unavailable. Please try again in a moment.');
          } else if (apiErr.message.includes('504')) {
            throw new Error('Request timeout. The server took too long to respond.');
          } else if (apiErr.message.includes('Authentication')) {
            throw new Error('Your session has expired. Please log in again.');
          } else {
            throw new Error('Failed to load orders: ' + apiErr.message);
          }
        }
        
        orders.value = orderData || [];
        console.log('[Dashboard] Orders loaded:', orders.value.length);
        
        if (orders.value.length > 0) {
          console.log('[Dashboard] First order sample:', {
            id: orders.value[0].id,
            orders_id: orders.value[0].orders_id,
            product: orders.value[0].product,
            model: orders.value[0].model,
            status: orders.value[0].status,
            payment_status: orders.value[0].payment_status
          });
        } else {
          console.log('[Dashboard] No orders found for user');
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch orders', err)
        console.error('[Dashboard] Error details:', err.message);
        alert(err.message || 'Failed to load orders')
        orders.value = []; // Ensure orders is an empty array on error
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
        if (form.customer_name) fd.append('customer_name', form.customer_name)
        if (form.order_name) fd.append('order_name', form.order_name)
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

    // Model management functions
    function addSizeField() {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] addSizeField called');
      console.log('[Dashboard] Current size_fields count:', newModel.value.size_fields.length);
      
      const newField = {
        key: '',
        label: '',
        type: 'number',
        unit: 'cm'
      };
      
      newModel.value.size_fields.push(newField);
      
      console.log('[Dashboard] New size_fields count:', newModel.value.size_fields.length);
      console.log('[Dashboard] Added field:', newField);
      console.log('[Dashboard] ========================================');
    }

    function removeSizeField(index) {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] removeSizeField called');
      console.log('[Dashboard] Removing field at index:', index);
      console.log('[Dashboard] Current size_fields count:', newModel.value.size_fields.length);
      
      if (index >= 0 && index < newModel.value.size_fields.length) {
        const removed = newModel.value.size_fields[index];
        console.log('[Dashboard] Field being removed:', removed);
        newModel.value.size_fields.splice(index, 1);
        console.log('[Dashboard] ✓ Field removed successfully');
      } else {
        console.error('[Dashboard] ❌ Invalid index:', index);
      }
      
      console.log('[Dashboard] New size_fields count:', newModel.value.size_fields.length);
      console.log('[Dashboard] ========================================');
    }

    async function createModel() {
      console.log('[Dashboard] ========================================');
      console.log('[Dashboard] === Creating new model ===');
      console.log('[Dashboard] Timestamp:', new Date().toISOString());
      console.log('[Dashboard] Current model data:', JSON.stringify(newModel.value, null, 2));
      
      try {
        // Step 1: Validate model name
        console.log('[Dashboard] Step 1: Validating model name');
        if (!newModel.value.name || !newModel.value.name.trim()) {
          console.error('[Dashboard] ❌ Model name is required');
          modelCreateMsg.value = 'Model name is required'
          return
        }
        console.log('[Dashboard] ✓ Model name valid:', newModel.value.name);

        // Step 2: Validate and filter size fields
        console.log('[Dashboard] Step 2: Validating size fields');
        console.log('[Dashboard] Total size fields:', newModel.value.size_fields.length);
        
        const sizeFields = newModel.value.size_fields.filter(f => {
          const isValid = !!(f.key && f.label);
          console.log('[Dashboard] Field validation:', {
            key: f.key || '(empty)',
            label: f.label || '(empty)',
            type: f.type,
            unit: f.unit,
            isValid
          });
          return isValid;
        });
        
        console.log('[Dashboard] Valid size fields:', sizeFields.length);
        
        // Warn if some fields are incomplete
        if (sizeFields.length < newModel.value.size_fields.length) {
          const incomplete = newModel.value.size_fields.length - sizeFields.length;
          console.warn(`[Dashboard] ⚠️  ${incomplete} incomplete fields will be removed`);
        }

        // Step 3: Prepare payload
        console.log('[Dashboard] Step 3: Preparing API payload');
        const payload = { 
          name: newModel.value.name.trim(), 
          description: newModel.value.description.trim() || null
        };
        
        // Only include size_fields if there are valid fields
        if (sizeFields.length > 0) {
          payload.size_fields = sizeFields;
          console.log('[Dashboard] Including size_fields in payload:', sizeFields.length);
        } else {
          console.log('[Dashboard] No valid size_fields to include');
        }
        
        console.log('[Dashboard] Payload prepared:', JSON.stringify(payload, null, 2));

        // Step 4: Send API request
        console.log('[Dashboard] Step 4: Sending POST /models request');
        const created = await apiPost('/models', payload);
        
        console.log('[Dashboard] ✓ Model created successfully!');
        console.log('[Dashboard] Created model:', JSON.stringify(created, null, 2));
        
        // Step 5: Update UI
        console.log('[Dashboard] Step 5: Updating UI');
        modelCreateMsg.value = `✓ Model "${newModel.value.name}" created successfully with ${sizeFields.length} size fields!`;
        console.log('[Dashboard] Success message set:', modelCreateMsg.value);
        
        // Step 6: Reload models to update dropdown
        console.log('[Dashboard] Step 6: Reloading models list');
        await loadModels();
        
        // Step 7: Auto-close and refresh
        console.log('[Dashboard] Step 7: Scheduling auto-close (2 seconds)');
        setTimeout(() => {
          console.log('[Dashboard] Auto-close timeout triggered');
          newModel.value = { name: '', description: '', size_fields: [] };
          viewMode.value = 'list';
          modelCreateMsg.value = '';
          console.log('[Dashboard] Form reset and closed');
        }, 2000);
        
        console.log('[Dashboard] === Model creation complete ===');
        console.log('[Dashboard] ========================================');
      } catch (err) {
        console.error('[Dashboard] ========================================');
        console.error('[Dashboard] ❌ Model creation failed');
        console.error('[Dashboard] Error name:', err.name);
        console.error('[Dashboard] Error message:', err.message);
        console.error('[Dashboard] Error stack:', err.stack);
        console.error('[Dashboard] Full error:', err);
        
        modelCreateMsg.value = '❌ Failed to create model: ' + (err.message || err);
        console.error('[Dashboard] Error message set:', modelCreateMsg.value);
        console.error('[Dashboard] === Model creation failed ===');
        console.error('[Dashboard] ========================================');
      }
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
      await loadModels()
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
      logout,
      newModel,
      modelCreateMsg,
      addSizeField,
      removeSizeField,
      createModel
    }
  }
}
</script>

<style scoped>
.dashboard { padding: 1rem }
</style>
