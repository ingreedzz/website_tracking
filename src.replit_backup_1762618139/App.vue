<template>
  <div class="app">
    <Navbar />
    <main>
      <router-view />
    </main>
    <footer class="site-footer">© <span>{{ new Date().getFullYear() }}</span> — Chiangho Tracking Order</footer>
  </div>
</template>

<script>
import Navbar from './components/Navbar.vue'

export default {
  name: 'App',
  components: { Navbar }
}
</script>

<style>
.site-header { padding: 1rem; background:#0f172a; color:#fff }
.site-header nav a { color:#9ca3af; margin:0 .5rem }
main { padding: 1.5rem }
.site-footer { padding: 1rem; text-align:center; color:#6b7280 }
</style>

