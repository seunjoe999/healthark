#!/usr/bin/env node

/**
 * Generate bcrypt hashes for test credentials
 * Run this to see what the hashes should be for password "Admin1234"
 */

const bcrypt = require('bcryptjs');

async function main() {
  const passwords = {
    'admin@healthark.co.uk': 'Admin1234',
    'manager@healthark.co.uk': 'Manager1234',
    'senior@healthark.co.uk': 'Admin1234',
    'care1@healthark.co.uk': 'Admin1234',
    'care2@healthark.co.uk': 'Admin1234',
  };

  console.log('Bcrypt Password Hashes (cost=12):\n');
  console.log('For SQL migrations, use these hashes:\n');

  for (const [email, password] of Object.entries(passwords)) {
    const hash = await bcrypt.hash(password, 12);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Hash: '${hash}'`);
    console.log('---');
  }

  console.log('\nNote: The hash "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LPVKhB7fRCi"');
  console.log('is NOT a valid hash for "Admin1234" - it\'s for "password"');
}

main().catch(console.error);
