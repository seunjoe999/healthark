// Fix timesheet pay and seed audit trail
const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({
  connectionString: 'postgresql://healthark_user:yplXYLHUaPksCpMi57e6PebPK0Yi6laF@dpg-d88dabjbc2fs73eqf960-a.oregon-postgres.render.com/healthark',
  ssl: { rejectUnauthorized: false },
});
const HOME = '5c027814-a0f9-44f3-bad4-138e4783fd51';

async function q(sql, params) {
  try { const r = await pool.query(sql, params); return r; }
  catch(e) { console.warn('  SKIP:', e.message.split('\n')[0].slice(0, 120)); return null; }
}

async function main() {
  // ── 1. Set hourly rates on timesheets by staff role ───────────────────────
  console.log('💷 Updating timesheet pay...');

  const rateByRole = {
    home_manager:  22.50,
    deputy_manager: 19.00,
    senior_carer:  15.50,
    care_staff:    13.00,
    nurse:         20.00,
    admin:         13.50,
  };

  const staffRes = await pool.query(
    "SELECT id, role FROM staff WHERE home_id = $1 AND is_active = true", [HOME]
  );

  for (const s of staffRes.rows) {
    const rate = rateByRole[s.role] || 13.00;
    const tsRes = await pool.query(
      "SELECT id, total_hours, overtime_hours FROM timesheets WHERE staff_id = $1", [s.id]
    );
    for (const ts of tsRes.rows) {
      const totalH = parseFloat(ts.total_hours) || 0;
      const otH    = parseFloat(ts.overtime_hours) || 0;
      const regH   = totalH - otH;
      const totalPay = (regH * rate + otH * rate * 1.5).toFixed(2);
      await q(
        `UPDATE timesheets SET hourly_rate = $1, total_pay = $2, updated_at = NOW() WHERE id = $3`,
        [rate, totalPay, ts.id]
      );
    }
    console.log(`  ✓ ${s.role} (£${rate}/hr) — ${tsRes.rows.length} timesheets updated`);
  }

  // ── 2. Seed audit trail ───────────────────────────────────────────────────
  console.log('\n📋 Seeding audit trail...');

  const staff = staffRes.rows;
  const s0 = staff[0]?.id;
  const s1 = (staff[1] || staff[0])?.id;
  const s2 = (staff[2] || staff[0])?.id;

  // Get some resource IDs to reference
  const suRes = await pool.query(
    "SELECT id, first_name, last_name FROM service_users WHERE home_id=$1 AND status='live' LIMIT 8", [HOME]
  );
  const sus = suRes.rows;

  const staffNameRes = await pool.query(
    "SELECT id, first_name || ' ' || last_name AS name, role FROM staff WHERE home_id=$1 AND is_active=true LIMIT 5", [HOME]
  );
  const staffNames = staffNameRes.rows;

  function daysAgo(n, h=9, m=0) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  const events = [];

  // Login events
  for (const st of staffNames) {
    for (let day = 21; day >= 0; day -= 3) {
      events.push({
        staffId: st.id, staffName: st.name,
        action: 'login', resourceType: 'session', resourceId: null, resourceLabel: 'User session',
        oldData: null, newData: JSON.stringify({ role: st.role }),
        ip: `192.168.1.${10 + staffNames.indexOf(st)}`,
        createdAt: daysAgo(day, 7, 30 + Math.floor(Math.random()*30)),
      });
    }
  }

  // Medication given events
  const marRes = await pool.query(
    "SELECT id, medication_id FROM mar_records WHERE home_id=$1 ORDER BY created_at DESC LIMIT 20", [HOME]
  );
  for (const rec of marRes.rows) {
    const st = staffNames[Math.floor(Math.random() * staffNames.length)];
    events.push({
      staffId: st.id, staffName: st.name,
      action: 'create', resourceType: 'mar_record', resourceId: rec.id, resourceLabel: 'MAR record — medication given',
      oldData: null, newData: JSON.stringify({ given: true }),
      ip: '192.168.1.10',
      createdAt: daysAgo(Math.floor(Math.random()*14), 8 + Math.floor(Math.random()*12)),
    });
  }

  // Daily record events
  const noteRes = await pool.query(
    "SELECT id, su_id FROM daily_records WHERE home_id=$1 ORDER BY created_at DESC LIMIT 15", [HOME]
  ).catch(() => ({ rows: [] }));
  for (const note of noteRes.rows) {
    const su = sus.find(s => s.id === note.su_id) || sus[0];
    const st = staffNames[Math.floor(Math.random() * staffNames.length)];
    if (!su) continue;
    events.push({
      staffId: st.id, staffName: st.name,
      action: 'create', resourceType: 'daily_record', resourceId: note.id,
      resourceLabel: `Daily record for ${su.first_name} ${su.last_name}`,
      oldData: null, newData: JSON.stringify({ su_id: su.id }),
      ip: '192.168.1.11',
      createdAt: daysAgo(Math.floor(Math.random()*10), 8 + Math.floor(Math.random()*14)),
    });
  }

  // Timesheet approve events
  const tsRes2 = await pool.query(
    "SELECT id, staff_id FROM timesheets WHERE home_id=$1 AND status='approved' LIMIT 10", [HOME]
  );
  for (const ts of tsRes2.rows) {
    const stName = staffNames[0];
    events.push({
      staffId: s0, staffName: stName?.name || 'Admin',
      action: 'approve', resourceType: 'timesheet', resourceId: ts.id, resourceLabel: 'Timesheet approved',
      oldData: JSON.stringify({ status: 'pending' }), newData: JSON.stringify({ status: 'approved' }),
      ip: '192.168.1.10',
      createdAt: daysAgo(Math.floor(Math.random()*14) + 1, 10),
    });
  }

  // Service user update events
  for (let i = 0; i < Math.min(sus.length, 6); i++) {
    const su = sus[i];
    const st = staffNames[i % staffNames.length];
    events.push({
      staffId: st.id, staffName: st.name,
      action: 'update', resourceType: 'service_user', resourceId: su.id,
      resourceLabel: `${su.first_name} ${su.last_name} — profile updated`,
      oldData: JSON.stringify({ status: 'live' }), newData: JSON.stringify({ status: 'live', updated: true }),
      ip: '192.168.1.12',
      createdAt: daysAgo(Math.floor(Math.random()*30) + 5, 9 + Math.floor(Math.random()*8)),
    });
  }

  // Incident report events
  const incRes = await pool.query(
    "SELECT id, su_id FROM records_incidents WHERE home_id=$1 ORDER BY created_at DESC LIMIT 8", [HOME]
  ).catch(() => ({ rows: [] }));
  for (let i = 0; i < Math.max(8, incRes.rows.length); i++) {
    const inc = incRes.rows[i];
    const su = (inc ? sus.find(s => s.id === inc?.su_id) : null) || sus[i % sus.length];
    const st = staffNames[i % staffNames.length];
    if (!su || !st) continue;
    events.push({
      staffId: st.id, staffName: st.name,
      action: 'create', resourceType: 'incident', resourceId: inc?.id || null,
      resourceLabel: `Incident report — ${su.first_name} ${su.last_name}`,
      oldData: null, newData: JSON.stringify({ su_id: su.id, severity: i % 3 === 0 ? 'high' : 'low' }),
      ip: '192.168.1.13',
      createdAt: daysAgo(Math.floor(Math.random()*21) + 2, 6 + Math.floor(Math.random()*16)),
    });
  }

  // DBS & compliance events
  for (let i = 0; i < staffNames.length; i++) {
    const st = staffNames[i];
    events.push({
      staffId: s0, staffName: staffNames[0]?.name || 'Admin',
      action: 'create', resourceType: 'staff_dbs', resourceId: null,
      resourceLabel: `DBS check uploaded — ${st.name}`,
      oldData: null, newData: JSON.stringify({ staff_id: st.id, dbs_type: 'enhanced_barred' }),
      ip: '192.168.1.10',
      createdAt: daysAgo(Math.floor(Math.random()*60) + 10, 11),
    });
  }

  // Password / settings changes
  events.push({
    staffId: s0, staffName: staffNames[0]?.name || 'Admin',
    action: 'update', resourceType: 'settings', resourceId: null, resourceLabel: 'Home settings updated',
    oldData: JSON.stringify({ notifications: false }), newData: JSON.stringify({ notifications: true }),
    ip: '192.168.1.10', createdAt: daysAgo(5, 14),
  });
  events.push({
    staffId: s1, staffName: staffNames[1]?.name || 'Staff',
    action: 'password_change', resourceType: 'staff', resourceId: s1, resourceLabel: 'Password changed',
    oldData: null, newData: null,
    ip: '192.168.1.15', createdAt: daysAgo(12, 16),
  });

  // Insert all events
  let inserted = 0;
  for (const ev of events) {
    const r = await q(
      `INSERT INTO audit_trail (id, home_id, staff_id, staff_name, action, resource_type, resource_id, resource_label, old_data, new_data, ip_address, created_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [HOME, ev.staffId, ev.staffName, ev.action, ev.resourceType,
       ev.resourceId || null, ev.resourceLabel,
       ev.oldData || null, ev.newData || null,
       ev.ip, ev.createdAt]
    );
    if (r) inserted++;
  }

  console.log(`  ✓ ${inserted} audit trail events inserted`);
  console.log('\n✅ Done!');
  await pool.end();
}

main().catch(e => { console.error(e); pool.end(); process.exit(1); });
