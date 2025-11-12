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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { setToken, decodeToken, getCurrentUser } from '../lib/auth'
export default {
  name: 'Login',
  setup() {
    const email = ref('')
    const password = ref('')

  const router = useRouter()

  async function login() {
      const timestamp = new Date().toISOString()
      console.log(`[${timestamp}] [LOGIN] === Starting login process ===`)
      console.log(`[${timestamp}] [LOGIN] Email: ${email.value}`)
      
      try {
        console.log(`[${timestamp}] [LOGIN] Step 1: Sending login request to /api/login`)
        const requestBody = { email: email.value, password: password.value }
        console.log(`[${timestamp}] [LOGIN] Request body (password hidden):`, { email: email.value, hasPassword: !!password.value })
        
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        })
        
        console.log(`[${timestamp}] [LOGIN] Response status: ${resp.status} ${resp.statusText}`)
        console.log(`[${timestamp}] [LOGIN] Response headers:`, {
          'content-type': resp.headers.get('content-type'),
          'content-length': resp.headers.get('content-length')
        })
        
        if (!resp.ok) {
          console.error(`[${timestamp}] [LOGIN] ❌ Login failed with status ${resp.status}`)
          // try JSON first, then text fallback so we surface server messages
          let eb = null
          try { 
            eb = await resp.json()
            console.error(`[${timestamp}] [LOGIN] Error response:`, eb)
          } catch (e) {
            console.error(`[${timestamp}] [LOGIN] Could not parse JSON error:`, e.message)
          }
          if (eb && eb.error) throw new Error(eb.error)
          try {
            const txt = await resp.text()
            console.error(`[${timestamp}] [LOGIN] Error text:`, txt)
            if (txt) throw new Error(`Server ${resp.status}: ${txt}`)
          } catch (e) {
            console.error(`[${timestamp}] [LOGIN] Could not get error text:`, e.message)
          }
          throw new Error('Login failed (' + resp.status + ')')
        }
        
        console.log(`[${timestamp}] [LOGIN] Step 2: Parsing response JSON`)
        const json = await resp.json()
        console.log(`[${timestamp}] [LOGIN] ✓ Response parsed successfully`)
        console.log(`[${timestamp}] [LOGIN] Response keys:`, Object.keys(json))
        
        // Backend returns { user, token }
        const token = json.token
        console.log(`[${timestamp}] [LOGIN] Token present:`, !!token)
        console.log(`[${timestamp}] [LOGIN] User present:`, !!json.user)
        
        if (token) {
          console.log(`[${timestamp}] [LOGIN] Step 3: Storing token`)
          setToken(token)
          console.log(`[${timestamp}] [LOGIN] ✓ Token stored`)
          
          // notify other parts of the app (Navbar) that auth changed
          console.log(`[${timestamp}] [LOGIN] Step 4: Dispatching auth-change event`)
          window.dispatchEvent(new Event('auth-change'))
          console.log(`[${timestamp}] [LOGIN] ✓ Event dispatched`)
        } else {
          console.error(`[${timestamp}] [LOGIN] ❌ No token returned from server`)
          throw new Error('No token returned')
        }

        console.log(`[${timestamp}] [LOGIN] Step 5: Decoding token and determining route`)
        const payload = decodeToken(token)
        console.log(`[${timestamp}] [LOGIN] Token payload:`, payload)
        
        const emailStr = (json.user && json.user.email) || (payload && payload.email) || ''
        const role = (payload && (payload.role || (payload.is_admin ? 'admin' : null))) || (json.user && json.user.role) || 'customer'
        
        console.log(`[${timestamp}] [LOGIN] User email: ${emailStr}`)
        console.log(`[${timestamp}] [LOGIN] User role: ${role}`)
        console.log(`[${timestamp}] [LOGIN] Is admin: ${role === 'admin'}`)
        
        alert('Logged in: ' + (emailStr || '') + ' (role: ' + role + ')')
        
        // route admins to AdminDashboard, others to regular Dashboard
        console.log(`[${timestamp}] [LOGIN] Step 6: Navigating to dashboard`)
        try {
          if (role === 'admin') {
            console.log(`[${timestamp}] [LOGIN] Redirecting to AdminDashboard`)
            await router.push({ name: 'AdminDashboard' })
          } else {
            console.log(`[${timestamp}] [LOGIN] Redirecting to Dashboard`)
            await router.push({ name: 'Dashboard' })
          }
          console.log(`[${timestamp}] [LOGIN] ✓ Navigation successful`)
        } catch (e) {
          console.warn(`[${timestamp}] [LOGIN] ⚠️  router.push failed:`, e)
        }
        
        console.log(`[${timestamp}] [LOGIN] === Login process complete ===`)
      } catch (err) {
        console.error(`[${timestamp}] [LOGIN] === Login process failed ===`)
        console.error(`[${timestamp}] [LOGIN] Error type: ${err.name}`)
        console.error(`[${timestamp}] [LOGIN] Error message: ${err.message}`)
        console.error(`[${timestamp}] [LOGIN] Error stack:`, err.stack)
        alert(err.message || String(err))
      }
    }
    // redirect if already logged in
    onMounted(() => {
      if (getCurrentUser()) {
        try { router.push({ name: 'Dashboard' }) } catch (e) { console.warn('[login] redirect failed', e) }
      }
    })

    return { email, password, login }
  }
}
</script>

<style scoped>
.login { padding: 1rem }
label { display:block; margin-bottom:.5rem }
input { display:block; padding:.5rem; width:100%; max-width:320px }
</style>
