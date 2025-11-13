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
      console.log('[Login] === Starting login process ===');
      console.log('[Login] Timestamp:', new Date().toISOString());
      console.log('[Login] Email:', email.value);
      
      try {
        console.log('[Login] Step 1: Sending login request to /api/login');
        const resp = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.value, password: password.value })
        })
        console.log('[Login] Response received - Status:', resp.status, resp.statusText);
        
        if (!resp.ok) {
          console.error('[Login] ❌ Login request failed with status:', resp.status);
          // try JSON first, then text fallback so we surface server messages
          let eb = null
          try { eb = await resp.json() } catch (e) {}
          if (eb && eb.error) {
            console.error('[Login] Error from backend:', eb.error);
            throw new Error(eb.error)
          }
          try {
            const txt = await resp.text()
            if (txt) {
              console.error('[Login] Error text from server:', txt);
              throw new Error(`Server ${resp.status}: ${txt}`)
            }
          } catch (e) {}
          throw new Error('Login failed (' + resp.status + ')')
        }
        
  console.log('[Login] Step 2: Parsing response JSON');
  const json = await resp.json()
  console.log('[Login] Response data:', { 
    hasUser: !!json.user, 
    hasToken: !!json.token,
    userEmail: json.user?.email 
  });
  
  // Backend returns { user, token }
  const token = json.token
  if (token) {
    console.log('[Login] Step 3: Setting token in storage');
    setToken(token)
    console.log('[Login] ✓ Token saved successfully');
    
    // notify other parts of the app (Navbar) that auth changed
    console.log('[Login] Step 4: Dispatching auth-change event');
    window.dispatchEvent(new Event('auth-change'))
    console.log('[Login] ✓ Auth-change event dispatched');
  } else {
    console.error('[Login] ❌ No token returned from backend');
    throw new Error('No token returned')
  }

  console.log('[Login] Step 5: Decoding token and determining role');
  const payload = decodeToken(token)
  console.log('[Login] Token payload:', { 
    email: payload?.email, 
    role: payload?.role, 
    is_admin: payload?.is_admin 
  });
  
  const emailStr = (json.user && json.user.email) || (payload && payload.email) || ''
  const role = (payload && (payload.role || (payload.is_admin ? 'admin' : null))) || (json.user && json.user.role) || null
  console.log('[Login] Determined role (only admin explicitly set):', role);
  console.log('[Login] User email:', emailStr);
  
  alert('Logged in: ' + (emailStr || '') + (role ? (' (role: ' + role + ')') : ''))
  
  // route admins to AdminDashboard, others to regular Dashboard
  console.log('[Login] Step 6: Routing to appropriate dashboard');
  try {
    if (payload && payload.is_admin) {
      console.log('[Login] Routing to AdminDashboard');
      await router.push({ name: 'AdminDashboard' })
    } else {
      console.log('[Login] Routing to Dashboard');
      await router.push({ name: 'Dashboard' })
    }
    console.log('[Login] ✓ Navigation successful');
  } catch (e) {
    console.warn('[Login] ⚠️  Router push failed:', e)
  }
  
  console.log('[Login] === Login process completed successfully ===');
      } catch (err) {
        console.error('[Login] === Login process failed ===');
        console.error('[Login] Error:', err);
        console.error('[Login] Error message:', err.message);
        console.error('[Login] Error stack:', err.stack);
        alert(err.message || String(err))
      }
    }
    // redirect if already logged in
    onMounted(() => {
      console.log('[Login] Component mounted - checking if user is already logged in');
      const currentUser = getCurrentUser();
      if (currentUser) {
        console.log('[Login] User already logged in:', { email: currentUser.email || currentUser.sub });
        console.log('[Login] Redirecting to Dashboard');
        try { router.push({ name: 'Dashboard' }) } catch (e) { console.warn('[Login] Redirect failed:', e) }
      } else {
        console.log('[Login] No user logged in, showing login form');
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
