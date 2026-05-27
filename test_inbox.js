const { Pool } = require('./backend/node_modules/pg')
const http = require('http')

const pool = new Pool({ host:'localhost', port:5432, database:'healthark', user:'postgres', password:'adeniji1234' })

function post(path, body, token) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const opts = {
      hostname: 'localhost', port: 3001, path: '/api' + path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...(token ? { Authorization: 'Bearer ' + token } : {}) }
    }
    const req = http.request(opts, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve(body) } })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 3001, path: '/api' + path, method: 'GET',
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    }
    const req = http.request(opts, res => {
      let body = ''
      res.on('data', d => body += d)
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch { resolve(body) } })
    })
    req.on('error', reject)
    req.end()
  })
}

async function run() {
  // Get two staff accounts
  const r = await pool.query("SELECT id, email FROM staff WHERE id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' AND is_active=true ORDER BY created_at LIMIT 2")
  if (r.rows.length < 2) { console.log('Need at least 2 staff'); process.exit(1) }
  const [s1, s2] = r.rows
  console.log('Staff 1:', s1.email)
  console.log('Staff 2:', s2.email)

  // Generate test tokens directly (bypass password check)
  const jwt = require('./backend/node_modules/jsonwebtoken')
  const homeR = await pool.query("SELECT home_id FROM staff WHERE id=$1", [s1.id])
  const homeId = homeR.rows[0]?.home_id
  const token1 = jwt.sign({ staffId: s1.id, email: s1.email, homeId, role: 'home_manager' }, 'test-secret-key-for-local', { expiresIn: '1h' })
  const token2 = jwt.sign({ staffId: s2.id, email: s2.email, homeId, role: 'care_staff' }, 'test-secret-key-for-local', { expiresIn: '1h' })

  // Send a message from s1 to s2
  console.log('\n--- Sending message from staff1 to staff2 ---')
  const sendRes = await post('/messages', { recipientId: s2.id, subject: 'Test inbox message', message: 'Hello from test! The inbox is working.' }, token1)
  console.log('Send result:', JSON.stringify(sendRes).substring(0, 200))

  // Fetch inbox for s2
  console.log('\n--- Fetching inbox for staff2 ---')
  const inboxRes = await get('/messages?type=inbox', token2)
  const msgs = inboxRes.data || []
  console.log('Messages in inbox:', msgs.length)
  if (msgs.length > 0) {
    const latest = msgs[0]
    console.log('Latest message subject:', latest.subject)
    console.log('Latest message body:', (latest.message || latest.body || '').substring(0, 80))
    console.log('Sender name:', latest.sender_name)
    console.log('Is read:', latest.is_read)
  }

  // Fetch sent for s1
  console.log('\n--- Fetching sent for staff1 ---')
  const sentRes = await get('/messages?type=sent', token1)
  const sent = sentRes.data || []
  console.log('Sent messages:', sent.length)
  if (sent.length > 0) console.log('Latest sent to:', sent[0].recipient_name, '| subject:', sent[0].subject)

  // Check notification was created for s2
  console.log('\n--- Checking notification for staff2 ---')
  const notifRes = await get('/notifications', token2)
  const notifs = notifRes.data || []
  const msgNotif = notifs.find(n => n.link === '/messages')
  console.log('Total notifications for staff2:', notifs.length)
  if (msgNotif) console.log('Message notification found:', msgNotif.title)
  else console.log('No message notification found')

  console.log('\n✓ Inbox test complete')
  pool.end()
}

run().catch(e => { console.error('TEST FAILED:', e.message); pool.end(); process.exit(1) })
