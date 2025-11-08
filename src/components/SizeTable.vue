<template>
  <div class="size-table">
    <div v-if="loading" class="p-4">Loading sizes…</div>
    <div v-else-if="error" class="p-4 text-red-600">{{ error }}</div>
    <table v-else class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Size</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">SKU</th>
          <th v-if="showStock" class="px-4 py-2 text-left text-sm font-medium text-gray-700">Stock</th>
          <th class="px-4 py-2 text-left text-sm font-medium text-gray-700">Price</th>
          <th class="px-4 py-2"></th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">
        <tr v-for="row in rows" :key="row.variantId">
          <td class="px-4 py-2 text-sm text-gray-800">{{ row.sizeLabel }}</td>
          <td class="px-4 py-2 text-sm text-gray-700">{{ row.sku || '—' }}</td>
          <td v-if="showStock" class="px-4 py-2 text-sm text-gray-700">{{ row.stock == null ? '—' : row.stock }}</td>
          <td class="px-4 py-2 text-sm text-gray-700">{{ formatPrice(row.price) }}</td>
          <td class="px-4 py-2 text-sm">
            <button class="px-2 py-1 bg-blue-600 text-white rounded text-sm" @click="$emit('add-to-cart', row)">Add</button>
          </td>
        </tr>
        <tr v-if="rows.length===0" class="bg-white"><td colspan="5" class="p-4">No sizes / variants found.</td></tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'

const props = defineProps({
  modelId: { type: String, required: false },
  variants: { type: Array, required: false },
  showStock: { type: Boolean, default: true }
})

const emit = defineEmits(['add-to-cart'])

const loading = ref(false)
const error = ref(null)
const rows = ref([])

function formatPrice(v) {
  if (v == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(v))
}

async function fetchForModel(mid) {
  loading.value = true
  error.value = null
  rows.value = []
  if (!supabase) {
    error.value = 'Supabase not configured'
    loading.value = false
    return
  }
  try {
    // Fetch product_variants for the model
    const { data: variantsData, error: varErr } = await supabase
      .from('product_variants')
      .select('*')
      .eq('model_id', mid)
    if (varErr) throw varErr

    const variantsList = variantsData || []

    // Collect size ids from variants
    const sizeIds = [...new Set(variantsList.map(v => v.size_id).filter(Boolean))]

    let sizesMap = new Map()
    if (sizeIds.length > 0) {
      // Try querying sizes by common column names: id then size_id
      let sizesRes = null
      try {
        sizesRes = await supabase.from('sizes').select('*').in('id', sizeIds)
        if (sizesRes.error) throw sizesRes.error
      } catch (e1) {
        // fallback to size_id column name (some migration scripts promote size_id)
        const { data: d2, error: e2 } = await supabase.from('sizes').select('*').in('size_id', sizeIds)
        if (e2) throw e2
        sizesRes = { data: d2 }
      }

      for (const s of sizesRes.data || []) {
        const key = s.size_id ?? s.id
        sizesMap.set(key, s)
      }
    }

    // Build rows combining variant + size info
    rows.value = variantsList.map(v => {
      const variantId = v.variants_id ?? v.id
      const sizeKey = v.size_id
      const sizeObj = sizesMap.get(sizeKey) || {}
      const sizeLabel = sizeObj.name || sizeObj.label || sizeObj.size || sizeObj.size_name || (sizeKey ? sizeKey : '—')
      return {
        variantId,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        sizeLabel,
        rawVariant: v
      }
    })

  } catch (err) {
    console.error('SizeTable fetch error', err)
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

async function useVariantsArray(arr) {
  loading.value = true
  error.value = null
  rows.value = []
  if (!supabase) {
    error.value = 'Supabase not configured'
    loading.value = false
    return
  }
  try {
    // map passed variants array into rows (attempt to find attached size info)
    const sizeIds = [...new Set(arr.map(v => v.size_id).filter(Boolean))]
    let sizesMap = new Map()
    if (sizeIds.length > 0) {
      // same defensive fetch for sizes
      try {
        const { data } = await supabase.from('sizes').select('*').in('id', sizeIds)
        for (const s of data || []) sizesMap.set(s.id, s)
      } catch (e) {
        const { data } = await supabase.from('sizes').select('*').in('size_id', sizeIds)
        for (const s of data || []) sizesMap.set(s.size_id, s)
      }
    }

    rows.value = arr.map(v => {
      const variantId = v.variants_id ?? v.id
      const sizeKey = v.size_id
      const sizeObj = sizesMap.get(sizeKey) || {}
      const sizeLabel = sizeObj.name || sizeObj.label || sizeObj.size || sizeObj.size_name || (sizeKey ? sizeKey : '—')
      return {
        variantId,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        sizeLabel,
        rawVariant: v
      }
    })
  } catch (err) {
    console.error('SizeTable useVariantsArray error', err)
    error.value = err.message || String(err)
  } finally {
    loading.value = false
  }
}

watch(() => props.modelId, (nv) => {
  if (nv) fetchForModel(nv)
})

watch(() => props.variants, (nv) => {
  if (nv && nv.length) useVariantsArray(nv)
})

onMounted(() => {
  if (props.variants && props.variants.length) {
    useVariantsArray(props.variants)
  } else if (props.modelId) {
    fetchForModel(props.modelId)
  }
})
</script>

<style scoped>
.size-table table { border-collapse: collapse; width: 100%; }
</style>
