<template>
  <header class="bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
      <h1 class="text-lg font-bold">Chiangho Admin Order Tracking</h1>
      <nav class="flex items-center space-x-2">
        <router-link to="/" class="px-3 py-2 rounded hover:bg-white/10">Dashboard</router-link>
      </nav>
    </div>
  </header>
</template>

<script setup>
// Simplified navbar for admin-only system - no authentication required
</script>

<style scoped>
.router-link-active {
  @apply bg-white/10 text-white font-semibold;
}
</style>

