const { Pool } = require('./backend/node_modules/pg')
const http = require('http')
const jwt = require('./backend/node_modules/jsonwebtoken')
const p = new Pool({ host:'localhost', port:5432, database:'healthark', user:'postgres', password:'adeniji1234' })

async function run() {
  // Check raw DB
  const msgs = await p.query("SELECT id, sender_id, recipient_id, subject, message, is_read FROM staff_messages ORDER BY created_at DESC LIMIT 5")
  console.log('--- Messages in DB ---')
  msgs.rows.forEach(m => console.log(m.id, m.subject, 'read:', m.is_read))

  // Get recipient from latest message
  const latest = msgs.rows[0]
  if (!latest) { console.log('No messages!'); p.end(); return }

  console.log('\nRecipient ID:', latest.recipient_id)

  // Get home_id for this staff
  const staffR = await p.query("SELECT home_id, email FROM staff WHERE id=$1", [latest.recipient_id])
  const staff = staffR.rows[0]
  console.log('Recipient email:', staff?.email, 'home_id:', staff?.home_id)

  // Make inbox call with correct recipient token
  const token = jwt.sign({ staffId: latest.recipient_id, homeId: staff?.home_id, role:'care_staff' }, 'test-secret-key-for-local', { expiresIn:'1h' })

  const inboxRes = await new Promise((resolve, reject) => {
    const opts = { hostname:'localhost', port:3001, path:'/api/messages?type=inbox', method:'GET', headers:{ Authorization:'Bearer '+token } }
    const req = http.request(opts, res => { let b=''; res.on('data',d=>b+=d); res.on('end',()=>{try{resolve(JSON.parse(b))}catch{resolve(b)}}) })
    req.on('error', reject)
    req.end()
  })
  console.log('\n--- Inbox API response ---')
  console.log('Count:', (inboxRes.data || []).length)
  if ((inboxRes.data || []).length > 0) {
    const m = inboxRes.data[0]
    console.log('Subject:', m.subject)
    console.log('Message:', (m.message || '').substring(0, 60))
    console.log('Sender:', m.sender_name)
  } else {
    console.log('Full response:', JSON.stringify(inboxRes).substring(0, 200))
  }

  p.end()
}

run().catch(e => { console.error('ERROR:', e.message); p.end() })
