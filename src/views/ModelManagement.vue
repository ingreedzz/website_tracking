<template>
  <section class="container py-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">Model Management</h2>
      <button @click="showAddForm = true" class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
        Add New Model
      </button>
    </div>

    <!-- Add/Edit Model Form -->
    <div v-if="showAddForm || editingModel" class="bg-white p-6 rounded shadow mb-6">
      <h3 class="font-semibold mb-4">{{ editingModel ? 'Edit Model' : 'Add New Model' }}</h3>
      <form @submit.prevent="saveModel">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label class="block">
            <span class="text-sm font-medium">Model Name *</span>
            <input 
              v-model="modelForm.name" 
              required 
              class="w-full border rounded px-3 py-2 mt-1"
              placeholder="e.g., Kaos Sekolah"
            />
          </label>
          
          <label class="block">
            <span class="text-sm font-medium">Description</span>
            <input 
              v-model="modelForm.description" 
              class="w-full border rounded px-3 py-2 mt-1"
              placeholder="e.g., Kaos sekolah standar"
            />
          </label>
        </div>

        <!-- Size Fields Configuration -->
        <div class="mt-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Size Fields</span>
            <button 
              type="button" 
              @click="addSizeField" 
              class="px-3 py-1 bg-green-500 text-white text-sm rounded"
            >
              + Add Field
            </button>
          </div>

          <div v-for="(field, index) in modelForm.size_fields" :key="index" class="border rounded p-3 mb-2 bg-gray-50">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input 
                v-model="field.key" 
                placeholder="Field Key (e.g., lingkar_dada)" 
                class="border rounded px-2 py-1 text-sm"
              />
              <input 
                v-model="field.label" 
                placeholder="Label (e.g., Lingkar Dada)" 
                class="border rounded px-2 py-1 text-sm"
              />
              <select v-model="field.type" class="border rounded px-2 py-1 text-sm">
                <option value="number">Number</option>
                <option value="text">Text</option>
              </select>
              <div class="flex items-center space-x-2">
                <input 
                  v-model="field.unit" 
                  placeholder="Unit (e.g., cm)" 
                  class="border rounded px-2 py-1 text-sm flex-1"
                />
                <button 
                  type="button" 
                  @click="removeSizeField(index)" 
                  class="px-2 py-1 bg-red-500 text-white text-sm rounded"
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <p v-if="modelForm.size_fields.length === 0" class="text-sm text-gray-500 italic">
            No size fields defined yet. Click "Add Field" to create one.
          </p>
        </div>

        <div class="mt-6 flex items-center space-x-3">
          <button type="submit" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            {{ editingModel ? 'Update Model' : 'Create Model' }}
          </button>
          <button type="button" @click="cancelForm" class="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
        </div>
      </form>
    </div>

    <!-- Models List -->
    <div class="bg-white rounded shadow overflow-hidden">
      <div v-if="loading" class="p-8 text-center">
        <p class="text-gray-500">Loading models...</p>
      </div>

      <div v-else-if="error" class="p-8 text-center">
        <p class="text-red-500">{{ error }}</p>
        <button @click="loadModels" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
          Retry
        </button>
      </div>

      <div v-else-if="models.length === 0" class="p-8 text-center">
        <p class="text-gray-500">No models found. Click "Add New Model" to create one.</p>
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size Fields</th>
              <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-for="model in models" :key="model.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-medium text-gray-900">{{ model.name }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-500">{{ model.description || 'N/A' }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-xs text-gray-500">
                  <span v-if="model.size_fields && model.size_fields.length > 0">
                    {{ model.size_fields.length }} field(s): 
                    {{ model.size_fields.map(f => f.label).join(', ') }}
                  </span>
                  <span v-else class="italic">No size fields</span>
                </div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm space-x-2">
                <button 
                  @click="editModel(model)" 
                  class="inline-flex px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button 
                  @click="deleteModel(model)" 
                  class="inline-flex px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser } from '../lib/auth'
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api'

const router = useRouter()
const models = ref([])
const loading = ref(false)
const error = ref(null)
const showAddForm = ref(false)
const editingModel = ref(null)

const modelForm = ref({
  name: '',
  description: '',
  size_fields: []
})

// Check if user is admin
onMounted(async () => {
  const user = getCurrentUser()
  if (!user || user.role !== 'admin') {
    alert('Access denied. Admin only.')
    router.push({ name: 'Home' })
    return
  }
  await loadModels()
})

async function loadModels() {
  loading.value = true
  error.value = null
  try {
    console.log('[ModelManagement] Loading models...')
    const response = await apiGet('/models')
    models.value = response || []
    console.log('[ModelManagement] Loaded', models.value.length, 'models')
  } catch (err) {
    console.error('[ModelManagement] Error loading models:', err)
    error.value = err.message || 'Failed to load models'
  } finally {
    loading.value = false
  }
}

function addSizeField() {
  modelForm.value.size_fields.push({
    key: '',
    label: '',
    type: 'number',
    unit: 'cm'
  })
}

function removeSizeField(index) {
  modelForm.value.size_fields.splice(index, 1)
}

function editModel(model) {
  editingModel.value = model
  modelForm.value = {
    name: model.name,
    description: model.description || '',
    size_fields: model.size_fields ? JSON.parse(JSON.stringify(model.size_fields)) : []
  }
  showAddForm.value = false
}

function cancelForm() {
  showAddForm.value = false
  editingModel.value = null
  modelForm.value = {
    name: '',
    description: '',
    size_fields: []
  }
}

async function saveModel() {
  try {
    console.log('[ModelManagement] Saving model:', modelForm.value)
    
    // Validate
    if (!modelForm.value.name.trim()) {
      alert('Model name is required')
      return
    }

    // Clean up size fields - remove empty ones
    const cleanedFields = modelForm.value.size_fields.filter(f => f.key && f.label)
    
    const payload = {
      name: modelForm.value.name.trim(),
      description: modelForm.value.description.trim(),
      size_fields: cleanedFields
    }

    if (editingModel.value) {
      // Update existing model
      await apiPut(`/models/${editingModel.value.id}`, payload)
      alert('Model updated successfully')
    } else {
      // Create new model
      await apiPost('/models', payload)
      alert('Model created successfully')
    }

    cancelForm()
    await loadModels()
  } catch (err) {
    console.error('[ModelManagement] Error saving model:', err)
    alert(err.message || 'Failed to save model')
  }
}

async function deleteModel(model) {
  if (!confirm(`Are you sure you want to delete "${model.name}"? This action cannot be undone.`)) {
    return
  }

  try {
    console.log('[ModelManagement] Deleting model:', model.id)
    await apiDelete(`/models/${model.id}`)
    alert('Model deleted successfully')
    await loadModels()
  } catch (err) {
    console.error('[ModelManagement] Error deleting model:', err)
    alert(err.message || 'Failed to delete model')
  }
}
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}
</style>
