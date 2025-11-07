import fetch from 'node-fetch'

;(async () => {
  try {
    const res = await fetch('https://yilwnvptucntnkapbdrh.supabase.co/rest/v1/?select=1', { method: 'GET', headers: { 'apikey': process.env.SUPABASE_KEY || '' } })
    console.log('status', res.status)
    const txt = await res.text()
    console.log('body', txt.slice(0, 500))
  } catch (err) { console.error('fetch error', err) }
})()
