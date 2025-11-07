<template>
  <header class="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">Chiangho Tracking Order</h1>
      <nav class="flex items-center space-x-2">
        <router-link to="/" class="px-3 py-2 rounded hover:bg-white/10">Home</router-link>
        <router-link to="/dashboard" class="px-3 py-2 rounded hover:bg-white/10">Dashboard</router-link>
        <router-link to="/register" class="px-3 py-2 rounded hover:bg-white/10">Register</router-link>
        <router-link to="/login" class="px-3 py-2 rounded hover:bg-white/10">Login</router-link>
      </nav>
    </div>
  </header>
</template>

<script>
export default {
  name: 'Navbar'
}
</script>

<style scoped>
.router-link-active {
  @apply bg-white/10 text-white font-semibold;
}
</style>

