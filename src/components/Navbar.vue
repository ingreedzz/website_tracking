<template>
  <header class="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">Chiangho Tracking Order</h1>
      <nav class="flex items-center space-x-2">
        <router-link to="/" class="px-3 py-2 rounded hover:bg-white/10">Home</router-link>
        <router-link to="/dashboard" class="px-3 py-2 rounded hover:bg-white/10">Dashboard</router-link>
        <router-link v-if="loggedIn" to="/payment" class="px-3 py-2 rounded hover:bg-white/10">Payment</router-link>
        <router-link v-if="!loggedIn" to="/register" class="px-3 py-2 rounded hover:bg-white/10">Register</router-link>
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
import { getCurrentUser, clearToken } from '../lib/auth'

const loggedIn = ref(false)
const userEmail = ref('')

function refreshUser() {
  const u = getCurrentUser()
    if (u) {
    loggedIn.value = true
    userEmail.value = u.email || u.sub || u.users_id || u.user_id || ''
  } else {
    loggedIn.value = false
    userEmail.value = ''
  }
}

function doLogout() {
  clearToken()
  refreshUser()
  // keep navigation inside the SPA so we don't trigger cross-deploy full reloads
  window.dispatchEvent(new Event('auth-change'))
  // prefer router navigation when available
  try {
    // router-link isn't available here so use location fallback which keeps same-origin
    window.history.pushState({}, '', '/')
    window.dispatchEvent(new Event('popstate'))
  } catch (e) {
    window.location.href = '/'
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

