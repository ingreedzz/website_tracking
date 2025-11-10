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
        const resp = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.form.name, email: this.form.email, password: this.form.password })
        })
        if (!resp.ok) {
          // try JSON first, then text fallback so we surface server messages
          let eb = null
          try { eb = await resp.json() } catch (e) {}
          if (eb && eb.error) throw new Error(eb.error)
          try {
            const txt = await resp.text()
            if (txt) throw new Error(`Server ${resp.status}: ${txt}`)
          } catch (e) {}
          throw new Error('Registration failed (' + resp.status + ')')
        }
        const json = await resp.json()
        // Backend returns { user, token }
        const token = json.token
        const { setToken } = await import('../lib/auth')
        if (token) setToken(token)
        alert('Registered successfully')
        this.$router.push({ name: 'Home' })
      } catch (err) {
        console.error('[register] error', err)
        alert(err.message || String(err))
      }
    }
  }
}
</script>
