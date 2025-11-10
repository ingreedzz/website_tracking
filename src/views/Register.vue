<template>
  <section class="container flex items-center justify-center min-h-[60vh]">
    <div class="w-full max-w-md bg-white p-8 rounded-lg shadow">
      <h2 class="text-2xl font-bold mb-4">Register</h2>
      <form @submit.prevent="register">
        <label class="block mb-2">
          <span class="text-sm">Name</span>
          <input v-model="form.name" class="w-full border rounded px-3 py-2 mt-1" type="text" />
        </label>
        <label class="block mb-2">
          <span class="text-sm">Email</span>
          <input v-model="form.email" class="w-full border rounded px-3 py-2 mt-1" type="email" />
        </label>
        <label class="block mb-4">
          <span class="text-sm">Password</span>
          <input v-model="form.password" class="w-full border rounded px-3 py-2 mt-1" type="password" />
        </label>
        <button class="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600">Create account</button>
      </form>
    </div>
  </section>
</template>

<script>
import { getCurrentUser } from '../lib/auth'

export default {
  name: 'Register',
  data() {
    return { form: { name: '', email: '', password: '' } }
  },
  methods: {
    async register() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || ''
        const resp = await fetch((apiBase.replace(/\/$/, '') || '') + '/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.form.name, email: this.form.email, password: this.form.password })
        })
        if (!resp.ok) {
          let data = null
          try { data = await resp.json() } catch (e) {}
          if (data && data.error) throw new Error(data.error)
          throw new Error('Register failed (' + resp.status + ')')
        }
        const data = await resp.json().catch(() => null)
        // if backend also returns token, set it and notify
        if (data && data.token) {
          const { setToken } = await import('../lib/auth')
          setToken(data.token)
          window.dispatchEvent(new Event('auth-change'))
          // navigate to dashboard using SPA router only
          try { this.$router.push({ name: 'Dashboard' }) } catch (e) { console.warn('[register] router.push failed', e) }
        } else {
          alert('Registered successfully')
          try { this.$router.push({ name: 'Home' }) } catch (e) { console.warn('[register] router.push failed', e) }
        }
      } catch (err) {
        console.error('[register] error', err)
        alert(err.message || String(err))
      }
    }
  }
}

</script>
