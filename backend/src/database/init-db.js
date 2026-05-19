#!/usr/bin/env node

/**
 * HealthArk Database Initialize Script
 * Sets up the database with proper test credentials
 * 
 * IMPORTANT: Run this AFTER creating the database user and database!
 * 
 * Prerequisites:
 * 1. PostgreSQL installed and running
 * 2. Created user: CREATE USER healthark_user WITH PASSWORD 'HealthArk2024';
 * 3. Created database: CREATE DATABASE healthark OWNER healthark_user;
 * 4. Granted permissions: GRANT ALL PRIVILEGES ON DATABASE healthark TO healthark_user;
 */

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.join(__dirname, '../../.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'healthark',
  user: process.env.DB_USER || 'healthark_user',
  password: process.env.DB_PASSWORD || 'HealthArk2024',
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database initialization...\n');
    
    // Check if tables exist
    const tableCheckRes = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'organisations'
      ) as exists;
    `);
    
    if (!tableCheckRes.rows[0].exists) {
      console.log('ERROR: Tables do not exist. Run migrations first:');
      console.log('  npm run migrate\n');
      return;
    }
    
    console.log('✓ Database tables exist\n');
    
    // Check if organisation exists
    const orgRes = await client.query(
      `SELECT id FROM organisations WHERE id = '00000000-0000-0000-0000-000000000001'`
    );
    
    if (orgRes.rows.length === 0) {
      console.log('Creating default organisation...');
      await client.query(
        `INSERT INTO organisations (id, name) VALUES 
         ('00000000-0000-0000-0000-000000000001', 'CompCare Hub Organisation')`
      );
      console.log('✓ Organisation created\n');
    } else {
      console.log('✓ Default organisation exists\n');
    }
    
    // Get or create home
    let homeId;
    const homeRes = await client.query(
      `SELECT id FROM homes WHERE organisation_id = '00000000-0000-0000-0000-000000000001' LIMIT 1`
    );
    
    if (homeRes.rows.length === 0) {
      console.log('Creating test home...');
      const createHomeRes = await client.query(
        `INSERT INTO homes (organisation_id, name, address1, postcode, is_active)
         VALUES ('00000000-0000-0000-0000-000000000001', 'Sunrise Care Home', '14 Meadow Lane', 'LE3 5BP', true)
         RETURNING id`
      );
      homeId = createHomeRes.rows[0].id;
      console.log('✓ Test home created\n');
    } else {
      homeId = homeRes.rows[0].id;
      console.log('✓ Test home exists\n');
    }
    
    // Create test users with proper bcrypt hashes
    const testUsers = [
      {
        email: 'admin@healthark.co.uk',
        firstName: 'System',
        lastName: 'Admin',
        password: 'Admin1234',
        role: 'group_admin'
      },
      {
        email: 'manager@healthark.co.uk',
        firstName: 'Sarah',
        lastName: 'Johnson',
        password: 'Manager1234',
        role: 'home_manager'
      },
      {
        email: 'senior@healthark.co.uk',
        firstName: 'Michael',
        lastName: 'Okafor',
        password: 'Admin1234',
        role: 'senior_carer'
      },
      {
        email: 'care1@healthark.co.uk',
        firstName: 'Priya',
        lastName: 'Sharma',
        password: 'Admin1234',
        role: 'care_staff'
      },
      {
        email: 'care2@healthark.co.uk',
        firstName: 'David',
        lastName: 'Mensah',
        password: 'Admin1234',
        role: 'care_staff'
      }
    ];
    
    console.log('Setting up test user accounts...');
    
    for (const user of testUsers) {
      const hash = await bcrypt.hash(user.password, 12);
      
      // Check if user exists
      const checkRes = await client.query(
        'SELECT id FROM staff WHERE email = $1',
        [user.email]
      );
      
      if (checkRes.rows.length === 0) {
        // Create new user
        const createRes = await client.query(
          `INSERT INTO staff (organisation_id, home_id, email, password_hash, first_name, last_name, role, is_active, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'active')
           RETURNING id`,
          ['00000000-0000-0000-0000-000000000001', homeId, user.email, hash, user.firstName, user.lastName, user.role]
        );
        
        const staffId = createRes.rows[0].id;
        
        // Create onboarding record
        await client.query(
          'INSERT INTO staff_onboarding (staff_id) VALUES ($1) ON CONFLICT DO NOTHING',
          [staffId]
        );
        
        // Create home access for non-admins
        if (user.role !== 'group_admin') {
          await client.query(
            'INSERT INTO staff_home_access (staff_id, home_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [staffId, homeId]
          );
        }
        
        console.log(`  ✓ Created ${user.email}`);
      } else {
        // Update existing user password
        const staffId = checkRes.rows[0].id;
        await client.query(
          'UPDATE staff SET password_hash = $1 WHERE id = $2',
          [hash, staffId]
        );
        console.log(`  ✓ Updated password for ${user.email}`);
      }
    }
    
    console.log('\n✓ Database initialization complete!\n');
    console.log('Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    testUsers.forEach(user => {
      console.log(`${user.email}: ${user.password}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (err) {
    console.error('Database initialization error:', err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.release();
    await pool.end();
  }
}

initDatabase().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
