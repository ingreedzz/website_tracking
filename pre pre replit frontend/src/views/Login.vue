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
import { setToken, decodeToken } from '../lib/auth'
export default {
  name: 'Login',
  setup() {
    const email = ref('')
    const password = ref('')

    async function login() {
      try {
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, password: password.value })
        })
        if (!resp.ok) {
          let eb = null
          try { eb = await resp.json() } catch (e) {}
          throw new Error((eb && eb.error) ? eb.error : 'Login failed')
        }
  const json = await resp.json()
  // Backend returns { user, token }
  const token = json.token
  if (token) setToken(token)
  else throw new Error('No token returned')

  const payload = decodeToken(token)
  const emailStr = (json.user && json.user.email) || (payload && payload.email) || ''
  const role = (payload && (payload.role || (payload.is_admin ? 'admin' : null))) || (json.user && json.user.role) || 'customer'
  alert('Logged in: ' + (emailStr || '') + ' (role: ' + role + ')')
  window.location.href = '/dashboard'
      } catch (err) {
        alert(err.message || String(err))
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
