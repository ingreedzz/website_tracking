<template>
  <header class="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">Chiangho Tracking Order</h1>
      <nav class="flex items-center space-x-2">
        <router-link to="/" class="px-3 py-2 rounded hover:bg-white/10">Home</router-link>
        <router-link v-if="isAdmin" to="/admin" class="px-3 py-2 rounded hover:bg-white/10">Admin</router-link>
        <router-link v-if="loggedIn" to="/dashboard" class="px-3 py-2 rounded hover:bg-white/10">Dashboard</router-link>
        <router-link v-if="loggedIn" to="/payment" class="px-3 py-2 rounded hover:bg-white/10">Payment</router-link>
        <router-link v-if="!loggedIn" to="/login" class="px-3 py-2 rounded hover:bg-white/10">Login</router-link>

        <div v-if="loggedIn" class="flex items-center space-x-2">
          <span class="text-sm opacity-90">{{ userEmail }}</span>
          <button @click="doLogout" class="px-3 py-2 bg-red-500 rounded">Logout</button>
        </div>
      </nav>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getCurrentUser, clearToken } from '../lib/auth'

const loggedIn = ref(false)
const userEmail = ref('')
const isAdmin = ref(false)

function refreshUser() {
  const u = getCurrentUser()
    if (u) {
    loggedIn.value = true
    userEmail.value = u.email || u.sub || u.users_id || u.user_id || ''
    isAdmin.value = (u.role === 'admin' || u.is_admin === true)
  } else {
    loggedIn.value = false
    userEmail.value = ''
    isAdmin.value = false
  }
}

const router = useRouter()

function doLogout() {
  clearToken()
  refreshUser()
  // keep navigation inside the SPA so we don't trigger cross-deploy full reloads
  window.dispatchEvent(new Event('auth-change'))
  // navigate using the router (SPA navigation only)
  try {
    router.push({ name: 'Home' }).catch(() => {})
  } catch (e) {
    console.warn('[navbar] router.push failed on logout', e)
  }
}

onMounted(() => {
  refreshUser()
  window.addEventListener('auth-change', refreshUser)
})

onUnmounted(() => {
  window.removeEventListener('auth-change', refreshUser)
})
</script>

<style scoped>
.router-link-active {
  @apply bg-white/10 text-white font-semibold;
}
</style>

