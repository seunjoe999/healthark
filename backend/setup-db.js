/**
 * Run this ONCE to set up the database and create an admin account.
 * Usage: node setup-db.js
 */

require('dotenv').config();
const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'healthark',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
};

async function main() {
  console.log('\n── HealthArk Database Setup ──────────────────────');
  console.log(`Connecting as: ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}`);

  if (!cfg.password) {
    console.error('\n❌  DB_PASSWORD is empty.');
    console.error('   1. Copy backend/.env.example → backend/.env');
    console.error('   2. Set DB_PASSWORD to your PostgreSQL password');
    console.error('   3. Run: node setup-db.js again\n');
    process.exit(1);
  }

  // Try connecting to postgres DB first to create healthark if needed
  const adminClient = new Client({ ...cfg, database: 'postgres' });
  try {
    await adminClient.connect();
    const exists = await adminClient.query(`SELECT 1 FROM pg_database WHERE datname='healthark'`);
    if (!exists.rows.length) {
      await adminClient.query('CREATE DATABASE healthark');
      console.log('✅  Created database: healthark');
    } else {
      console.log('✅  Database already exists: healthark');
    }
  } catch (err) {
    console.error('\n❌  Could not connect to PostgreSQL:', err.message);
    console.error('\n   Check your .env file:');
    console.error(`   DB_USER=${cfg.user}`);
    console.error(`   DB_PASSWORD=${cfg.password ? '(set)' : '(EMPTY!)'}`);
    console.error(`   DB_HOST=${cfg.host}`);
    console.error(`   DB_PORT=${cfg.port}\n`);
    process.exit(1);
  } finally {
    await adminClient.end();
  }

  // Now connect to healthark and run schema + seed
  const client = new Client(cfg);
  try {
    await client.connect();

    // Run schema
    const schemaPath = path.join(__dirname, '..', 'database', '001_schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schema);
      console.log('✅  Schema applied');
    }

    // Run migration for any missing columns
    const migration = path.join(__dirname, '..', 'database', '002_add_missing_columns.sql');
    if (fs.existsSync(migration)) {
      await client.query(fs.readFileSync(migration, 'utf8'));
      console.log('✅  Migrations applied');
    }

    // Check if admin already exists
    const existing = await client.query(`SELECT id FROM staff WHERE email='admin@compcarehub.co.uk'`);
    if (existing.rows.length) {
      console.log('✅  Admin account already exists (admin@compcarehub.co.uk)');
    } else {
      // Get or create org
      let orgId;
      const orgs = await client.query(`SELECT id FROM organisations LIMIT 1`);
      if (orgs.rows.length) {
        orgId = orgs.rows[0].id;
      } else {
        const org = await client.query(
          `INSERT INTO organisations (name, reg_number, email, phone, address1, postcode)
           VALUES ('Demo Care Group','REG-001','admin@democaregroup.co.uk','01234567890','1 Care Lane','EC1A 1BB')
           RETURNING id`
        );
        orgId = org.rows[0].id;
      }

      // Get or create home
      let homeId;
      const homes = await client.query(`SELECT id FROM homes LIMIT 1`);
      if (homes.rows.length) {
        homeId = homes.rows[0].id;
      } else {
        const home = await client.query(
          `INSERT INTO homes (organisation_id, name, address1, postcode, qr_token)
           VALUES ($1,'Sunrise Care Home','1 Care Lane','EC1A 1BB','SUNRISE2024')
           RETURNING id`,
          [orgId]
        );
        homeId = home.rows[0].id;
      }

      // Create admin
      const hash = await bcrypt.hash('Admin1234', 12);
      await client.query(
        `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, status, is_active)
         VALUES ($1,$2,'admin@compcarehub.co.uk',$3,'Admin','User','group_admin','active',true)`,
        [orgId, homeId, hash]
      );
      console.log('✅  Admin account created');
    }

    console.log('\n🎉  Setup complete!');
    console.log('   Email:    admin@compcarehub.co.uk');
    console.log('   Password: Admin1234\n');
  } catch (err) {
    console.error('❌  Setup failed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
