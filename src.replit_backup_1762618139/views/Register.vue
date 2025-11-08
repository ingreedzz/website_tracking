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
export default {
  name: 'Register',
  data() {
    return { form: { name: '', email: '', password: '' } }
  },
  methods: {
    async register() {
      try {
        const apiBase = import.meta.env.VITE_API_URL || ''
        const res = await fetch((apiBase.replace(/\/$/, '') || '') + '/api/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.form)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Register failed')
        alert('Registered: ' + (data.email || ''))
      } catch (err) {
        alert(err.message)
      }
    }
  }
}
</script>
