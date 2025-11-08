<template>
  <section class="container flex items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-md bg-white p-8 rounded-lg shadow">
    <h2 class="text-2xl font-bold mb-4">Login</h2>
    <form @submit.prevent="login">
        <label class="block mb-2">
          <span class="text-sm">Email</span>
          <input v-model="email" type="email" class="w-full border rounded px-3 py-2 mt-1" />
        </label>
        <label class="block mb-4">
          <span class="text-sm">Password</span>
          <input v-model="password" type="password" class="w-full border rounded px-3 py-2 mt-1" />
        </label>
        <button type="submit" class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Sign in</button>
      </form>
    </div>
  </section>

</template>

<script>
import { ref } from 'vue'
export default {
  name: 'Login',
  setup() {
    const email = ref('')
    const password = ref('')

    async function login() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || ''
        const res = await fetch((apiBase.replace(/\/$/, '') || '') + '/api/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, password: password.value })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Login failed')
        alert('Logged in: ' + (data.user?.email || ''))
      } catch (err) {
        alert(err.message)
      }
    }

    return { email, password, login }
  }
}
</script>

<style scoped>
.login { padding: 1rem }
label { display:block; margin-bottom:.5rem }
input { display:block; padding:.5rem; width:100%; max-width:320px }
</style>
