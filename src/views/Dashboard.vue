<template>
  <section class="dashboard container py-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">Admin Order Tracking Dashboard</h2>
      <div class="space-x-2">
        <button @click="viewMode = 'create'" class="px-3 py-2 bg-blue-500 text-white rounded">Make New Order</button>
        <button @click="viewMode = 'models'" class="px-3 py-2 bg-green-600 text-white rounded">Manage Models</button>
        <button @click="viewMode = 'list'" class="px-3 py-2 bg-gray-700 text-white rounded">Show Orders</button>
      </div>
    </div>

    <!-- Model Management Section -->
    <div v-if="viewMode === 'models'" class="bg-white p-6 rounded shadow">
      <h3 class="font-semibold mb-4 text-lg">Model Management</h3>
      
      <!-- Create New Model Form -->
      <div class="bg-gray-50 p-4 rounded mb-6">
        <h4 class="font-semibold mb-3">Create New Model</h4>
        <form @submit.prevent="handleCreateModel">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="block">
              <div class="text-sm font-medium mb-1">Model Name <span class="text-red-500">*</span></div>
              <input v-model="newModel.name" placeholder="e.g., Kaos Polo" class="w-full border rounded px-3 py-2" required />
            </label>
            <label class="block">
              <div class="text-sm font-medium mb-1">Description</div>
              <input v-model="newModel.description" placeholder="Short description" class="w-full border rounded px-3 py-2" />
            </label>
          </div>
          
          <!-- Size Field Configuration -->
          <div class="mt-4">
            <div class="text-sm font-medium mb-2">Size Fields Configuration</div>
            <div class="text-xs text-gray-600 mb-3">Select which size fields this model should have. You can add custom fields below.</div>
            
            <!-- Predefined Size Field Checkboxes -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
              <label v-for="field in availableSizeFields" :key="field.key" class="flex items-center space-x-2 text-sm">
                <input type="checkbox" :value="field" v-model="newModel.selectedFields" class="rounded" />
                <span>{{ field.label }}</span>
              </label>
            </div>
            
            <!-- Custom Size Field Input -->
            <div class="border-t pt-3">
              <div class="text-sm font-medium mb-2">Add Custom Size Field</div>
              <div class="grid grid-cols-4 gap-2">
                <input v-model="customField.label" placeholder="Label (e.g., Panjang Kaki)" class="border rounded px-2 py-1" />
                <input v-model="customField.key" placeholder="Key (e.g., panjang_kaki)" class="border rounded px-2 py-1" />
                <select v-model="customField.type" class="border rounded px-2 py-1">
                  <option value="number">Number</option>
                  <option value="text">Text</option>
                </select>
                <div class="flex gap-2">
                  <input v-model="customField.unit" placeholder="Unit (cm)" class="border rounded px-2 py-1 flex-1" />
                  <button type="button" @click="addCustomField" class="px-3 py-1 bg-blue-500 text-white rounded text-sm">Add</button>
                </div>
              </div>
            </div>
            
            <!-- Selected Fields Preview -->
            <div v-if="newModel.selectedFields.length > 0" class="mt-3 p-3 bg-blue-50 rounded">
              <div class="text-sm font-medium mb-2">Selected Fields ({{ newModel.selectedFields.length }}):</div>
              <div class="flex flex-wrap gap-2">
                <span v-for="(field, idx) in newModel.selectedFields" :key="idx" class="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                  {{ field.label }} ({{ field.type }})
                  <button type="button" @click="removeField(idx)" class="ml-2 text-blue-600 hover:text-blue-800">×</button>
                </span>
              </div>
            </div>
          </div>
          
          <div class="mt-4 flex items-center space-x-3">
            <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded">Create Model</button>
            <button type="button" @click="resetModelForm" class="px-4 py-2 bg-gray-300 rounded">Reset</button>
          </div>
          
          <div v-if="modelMessage" class="mt-3 p-3 rounded" :class="modelMessageType === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
            {{ modelMessage }}
          </div>
        </form>
      </div>
      
      <!-- Existing Models List -->
      <div>
        <h4 class="font-semibold mb-3">Existing Models ({{ modelOptions.length }})</h4>
        <div v-if="modelOptions.length === 0" class="text-gray-500 text-sm">No models found. Create your first model above.</div>
        <div v-else class="space-y-3">
          <div v-for="model in modelOptions" :key="model.key" class="border rounded p-4">
            <div class="flex justify-between items-start">
              <div>
                <h5 class="font-semibold">{{ model.label }}</h5>
                <div class="text-sm text-gray-600 mt-1">
                  {{ model.fields.length }} size field(s):
                  <span v-for="(field, idx) in model.fields" :key="idx" class="inline-block ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                    {{ field.label }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
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
import { supabase } from '../lib/supabase'
import { apiGet, apiPostFormData, apiPost } from '../lib/api'

export default {
  name: 'Dashboard',
  components: { OrderCard },
  setup() {
    const router = useRouter()
    const orders = ref([])
    const loading = ref(false)
    const viewMode = ref('list')

  const form = reactive({ product: '', model: '', size: '', color: '', address: '', phone: '', quantity: 1, custom: {}, deadline: '', customer_name: '', order_name: '' })
    const fileRef = ref(null)
    const previewUrl = ref(null)
    const bucketName = 'sablon-images' // make sure this bucket exists in Supabase Storage

    const publicUrlCache = {}

    // Model options - will be fetched from backend or use fallback
    const modelOptions = ref([])
    
    // Model management
    const newModel = ref({
      name: '',
      description: '',
      selectedFields: []
    })
    const customField = ref({
      label: '',
      key: '',
      type: 'number',
      unit: 'cm'
    })
    const modelMessage = ref('')
    const modelMessageType = ref('success')
    
    // Available predefined size fields
    const availableSizeFields = [
      { key: 'lingkar_dada', label: 'Lingkar Dada', type: 'number', unit: 'cm' },
      { key: 'panjang_baju', label: 'Panjang Baju', type: 'number', unit: 'cm' },
      { key: 'panjang_celana', label: 'Panjang Celana', type: 'number', unit: 'cm' },
      { key: 'lingkar_pinggang', label: 'Lingkar Pinggang', type: 'number', unit: 'cm' },
      { key: 'panjang_lengan', label: 'Panjang Lengan', type: 'number', unit: 'cm' },
      { key: 'lebar_bahu', label: 'Lebar Bahu', type: 'number', unit: 'cm' },
      { key: 'lingkar_leher', label: 'Lingkar Leher', type: 'number', unit: 'cm' },
      { key: 'panjang_rok', label: 'Panjang Rok', type: 'number', unit: 'cm' }
    ]
    
    // Fallback model options with hardcoded fields (used if backend doesn't have models or size_fields)
    
    // Load models from backend
    async function loadModels() {
      console.log('[Dashboard] === Loading models from backend ===');
      try {
        const models = await apiGet('/models');
        console.log('[Dashboard] Models loaded:', models.length);
        
        if (models && models.length > 0) {
          // Convert backend models to frontend format
          modelOptions.value = models.map(m => {
            // If model has size_fields from DB, use them
            if (m.size_fields && Array.isArray(m.size_fields) && m.size_fields.length > 0) {
              return {
                key: m.name || m.models_id,
                label: m.name || 'Unknown Model',
                fields: m.size_fields.map(f => ({
                  key: f.key || f.name || '',
                  label: f.label || f.name || '',
                  type: f.type || 'text',
                  unit: f.unit || ''
                }))
              };
            } else {
              // No size_fields
              return {
                key: m.name || m.models_id,
                label: m.name || 'Unknown Model',
                fields: []
              };
            }
          });
          
          console.log('[Dashboard] Models converted:', modelOptions.value.length);
        } else {
          console.warn('[Dashboard] No models from backend');
          modelOptions.value = [];
        }
      } catch (err) {
        console.error('[Dashboard] Failed to load models:', err.message);
        modelOptions.value = [];
      }
      
      // Ensure form.model is initialized to a valid model
      if (!form.model && modelOptions.value.length > 0) {
        form.model = modelOptions.value[0].key;
      }
    }

    // Model management functions
    function addCustomField() {
      if (!customField.value.label || !customField.value.key) {
        alert('Please enter both label and key for the custom field');
        return;
      }
      
      newModel.value.selectedFields.push({
        key: customField.value.key,
        label: customField.value.label,
        type: customField.value.type,
        unit: customField.value.unit
      });
      
      // Reset custom field form
      customField.value = {
        label: '',
        key: '',
        type: 'number',
        unit: 'cm'
      };
    }
    
    function removeField(index) {
      newModel.value.selectedFields.splice(index, 1);
    }
    
    function resetModelForm() {
      newModel.value = {
        name: '',
        description: '',
        selectedFields: []
      };
      customField.value = {
        label: '',
        key: '',
        type: 'number',
        unit: 'cm'
      };
      modelMessage.value = '';
    }
    
    async function handleCreateModel() {
      console.log('[Dashboard] === Creating new model ===');
      modelMessage.value = '';
      
      try {
        if (!newModel.value.name) {
          throw new Error('Model name is required');
        }
        
        if (newModel.value.selectedFields.length === 0) {
          throw new Error('Please select at least one size field');
        }
        
        const payload = {
          name: newModel.value.name,
          description: newModel.value.description || '',
          size_fields: newModel.value.selectedFields
        };
        
        console.log('[Dashboard] Creating model with payload:', payload);
        
        // Note: This endpoint requires admin auth, but since we're removing auth,
        // we'll need to update the backend to not require it, or use a default token
        const result = await apiPost('/models', payload);
        console.log('[Dashboard] Model created:', result);
        
        modelMessage.value = `Model "${newModel.value.name}" created successfully!`;
        modelMessageType.value = 'success';
        
        // Reload models to show the new one
        await loadModels();
        
        // Reset form after successful creation
        setTimeout(() => {
          resetModelForm();
        }, 2000);
        
      } catch (err) {
        console.error('[Dashboard] Failed to create model:', err);
        modelMessage.value = 'Failed to create model: ' + (err.message || err);
        modelMessageType.value = 'error';
      }
    }

    function getFieldsForModel(key) {
      const m = modelOptions.value.find(x => x.key === key)
      return m ? m.fields : []
    }

    async function load() {
      console.log('[Dashboard] === Loading orders ===');
      loading.value = true

      try {
        // Load all orders (admin view, no authentication required)
        console.log('[Dashboard] Fetching all orders from /orders');
        
        let orderData;
        try {
          orderData = await apiGet('/orders');
        } catch (apiErr) {
          console.error('[Dashboard] API request failed');
          console.error('[Dashboard] Error message:', apiErr.message);
          
          // Provide user-friendly error messages
          if (apiErr.message.includes('502')) {
            throw new Error('Server is temporarily unavailable. Please try again in a moment.');
          } else if (apiErr.message.includes('504')) {
            throw new Error('Request timeout. The server took too long to respond.');
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
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch orders', err)
        console.error('[Dashboard] Error details:', err.message);
        alert(err.message || 'Failed to load orders')
        orders.value = [];
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
        alert('Order created successfully!');
        
        viewMode.value = 'list';
        // reset UI
        resetForm();
        console.log('[FRONTEND] === Order creation complete ===');
      } catch (err) {
        console.error('[FRONTEND] === Order creation failed ===');
        console.error('[FRONTEND] Error:', err);
        console.error('[FRONTEND] Error message:', err.message);
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
      // Model management
      newModel,
      customField,
      availableSizeFields,
      modelMessage,
      modelMessageType,
      addCustomField,
      removeField,
      resetModelForm,
      handleCreateModel
    }
  }
}
</script>

<style scoped>
.dashboard { padding: 1rem }
</style>
