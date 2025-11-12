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
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [REGISTER] === Starting registration process ===`)
      console.log(`[${timestamp}] [REGISTER] Name: ${this.form.name}`)
      console.log(`[${timestamp}] [REGISTER] Email: ${this.form.email}`)
      
      try {
        const apiBase = import.meta.env.VITE_API_URL || ''
        const registerUrl = (apiBase.replace(/\/$/, '') || '') + '/api/register'
        console.log(`[${timestamp}] [REGISTER] Step 1: Sending registration request`)
        console.log(`[${timestamp}] [REGISTER] API Base: ${apiBase || '(using relative path)'}`)
        console.log(`[${timestamp}] [REGISTER] Register URL: ${registerUrl}`)
        
        const requestBody = { 
          name: this.form.name, 
          email: this.form.email, 
          password: this.form.password 
        }
        console.log(`[${timestamp}] [REGISTER] Request body (password hidden):`, { 
          name: this.form.name, 
          email: this.form.email, 
          hasPassword: !!this.form.password 
        })
        
        const resp = await fetch(registerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        console.log(`[${timestamp}] [REGISTER] Response status: ${resp.status} ${resp.statusText}`)
        console.log(`[${timestamp}] [REGISTER] Response headers:`, {
          'content-type': resp.headers.get('content-type'),
          'content-length': resp.headers.get('content-length')
        })
        
        if (!resp.ok) {
          console.error(`[${timestamp}] [REGISTER] ❌ Registration failed with status ${resp.status}`)
          let data = null
          try { 
            data = await resp.json()
            console.error(`[${timestamp}] [REGISTER] Error response:`, data)
          } catch (e) {
            console.error(`[${timestamp}] [REGISTER] Could not parse JSON error:`, e.message)
          }
          if (data && data.error) throw new Error(data.error)
          throw new Error('Register failed (' + resp.status + ')')
        }
        
        console.log(`[${timestamp}] [REGISTER] Step 2: Parsing response JSON`)
        const data = await resp.json().catch(() => null)
        console.log(`[${timestamp}] [REGISTER] ✓ Response parsed successfully`)
        console.log(`[${timestamp}] [REGISTER] Response keys:`, data ? Object.keys(data) : [])
        console.log(`[${timestamp}] [REGISTER] Token present:`, !!(data && data.token))
        console.log(`[${timestamp}] [REGISTER] User present:`, !!(data && data.user))
        
        // if backend also returns token, set it and notify
        if (data && data.token) {
          console.log(`[${timestamp}] [REGISTER] Step 3: Storing token and dispatching event`)
          const { setToken } = await import('../lib/auth')
          setToken(data.token)
          console.log(`[${timestamp}] [REGISTER] ✓ Token stored`)
          
          window.dispatchEvent(new Event('auth-change'))
          console.log(`[${timestamp}] [REGISTER] ✓ Event dispatched`)
          
          // navigate to dashboard using SPA router only
          console.log(`[${timestamp}] [REGISTER] Step 4: Navigating to Dashboard`)
          try { 
            await this.$router.push({ name: 'Dashboard' })
            console.log(`[${timestamp}] [REGISTER] ✓ Navigation successful`)
          } catch (e) { 
            console.warn(`[${timestamp}] [REGISTER] ⚠️  router.push failed:`, e)
          }
        } else {
          console.log(`[${timestamp}] [REGISTER] No token returned, navigating to Home`)
          alert('Registered successfully')
          try { 
            await this.$router.push({ name: 'Home' })
            console.log(`[${timestamp}] [REGISTER] ✓ Navigation to Home successful`)
          } catch (e) { 
            console.warn(`[${timestamp}] [REGISTER] ⚠️  router.push failed:`, e)
          }
        }
        
        console.log(`[${timestamp}] [REGISTER] === Registration process complete ===`)
      } catch (err) {
        console.error(`[${timestamp}] [REGISTER] === Registration process failed ===`)
        console.error(`[${timestamp}] [REGISTER] Error type: ${err.name}`)
        console.error(`[${timestamp}] [REGISTER] Error message: ${err.message}`)
        console.error(`[${timestamp}] [REGISTER] Error stack:`, err.stack)
        alert(err.message || String(err))
      }
    }
  }
}

</script>
