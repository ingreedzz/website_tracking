#!/usr/bin/env node
const fs = require('fs')
const path = require('path')
const axios = require('axios')
const jwt = require('jsonwebtoken')

function usage() {
  console.log('Usage: node dispatch_with_app.js --app-id <APP_ID> --installation-id <INSTALL_ID> --private-key <path-to-pem> --owner <owner> --repo <repo> --workflow <workflow-file-or-id> [--ref main] [--inputs "{...}"]')
  process.exit(1)
}

function getArg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1]
}

async function main() {
  const appId = getArg('--app-id')
  const installationId = getArg('--installation-id')
  const privateKeyPath = getArg('--private-key')
  const owner = getArg('--owner')
  const repo = getArg('--repo')
  const workflow = getArg('--workflow')
  const ref = getArg('--ref') || 'main'
  const inputsRaw = getArg('--inputs') || null

  if (!appId || !installationId || !privateKeyPath || !owner || !repo || !workflow) {
    usage()
  }

  const privateKey = fs.readFileSync(path.resolve(privateKeyPath), 'utf8')

  // Create JWT for GitHub App authentication
  const now = Math.floor(Date.now() / 1000)
  const payload = {}
  const options = {
    algorithm: 'RS256',
    issuer: String(appId),
    expiresIn: 600 // 10 minutes
  }

  const appJwt = jwt.sign(payload, privateKey, options)

  try {
    console.log('Requesting installation access token...')
    const installUrl = `https://api.github.com/app/installations/${installationId}/access_tokens`
    const installResp = await axios.post(installUrl, {}, {
      headers: {
        Authorization: `Bearer ${appJwt}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'website-tracking-dispatcher'
      }
    })

    const installToken = installResp.data.token
    console.log('✓ Received installation token (masked):', installToken ? installToken.slice(0,6) + '...' : '(none)')

    // Dispatch workflow
    console.log(`Dispatching workflow ${workflow} on ${owner}/${repo}@${ref} ...`)
    const dispatchUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`
    const body = { ref }
    if (inputsRaw) {
      try { body.inputs = JSON.parse(inputsRaw) } catch (e) { console.warn('Invalid JSON for --inputs, ignoring'); }
    }

    await axios.post(dispatchUrl, body, {
      headers: {
        Authorization: `Bearer ${installToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'website-tracking-dispatcher'
      }
    })

    console.log('✓ Workflow dispatch request sent.');

    // Try to fetch recent runs for that workflow to find the dispatched run
    const runsUrl = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${encodeURIComponent(workflow)}/runs?per_page=5`
    const runsResp = await axios.get(runsUrl, {
      headers: {
        Authorization: `Bearer ${installToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'website-tracking-dispatcher'
      }
    })

    const runs = runsResp.data && runsResp.data.workflow_runs ? runsResp.data.workflow_runs : []
    if (runs.length === 0) {
      console.log('No recent runs found for this workflow (yet).');
    } else {
      const newest = runs[0]
      console.log('Recent run found:')
      console.log('  id:', newest.id)
      console.log('  status:', newest.status)
      console.log('  conclusion:', newest.conclusion)
      console.log('  html_url:', newest.html_url)
    }

    console.log('Done.')
  } catch (err) {
    console.error('Error during dispatch:', err.response ? err.response.data : err.message)
    process.exit(2)
  }
}

main()
