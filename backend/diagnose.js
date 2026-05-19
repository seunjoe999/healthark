#!/usr/bin/env node

/**
 * HealthArk Diagnostic Script
 * Checks system setup and identifies issues
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(symbol, msg, color = 'reset') {
  console.log(`${colors[color]}${symbol}${colors.reset} ${msg}`);
}

function section(title) {
  console.log(`\n${colors.blue}═══ ${title} ═══${colors.reset}`);
}

async function main() {
  console.log(`${colors.blue}
╔════════════════════════════════════╗
║   HealthArk Diagnostic Tool        ║
║   System Health Check              ║
╚════════════════════════════════════╝${colors.reset}\n`);

  // Check environment
  section('Environment Setup');
  
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    log('✓', '.env file exists', 'green');
    try {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const hasDbPassword = envContent.includes('DB_PASSWORD');
      const hasJwtSecret = envContent.includes('JWT_SECRET');
      
      if (hasDbPassword && hasJwtSecret) {
        log('✓', 'Critical environment variables configured', 'green');
      } else {
        log('✗', 'Missing critical environment variables', 'red');
      }
    } catch (e) {
      log('✗', `Error reading .env: ${e.message}`, 'red');
    }
  } else {
    log('✗', '.env file not found - copy .env.example to .env', 'red');
  }

  // Check Node modules
  section('Dependencies');
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    log('✓', 'node_modules exists', 'green');
    const pkgPath = path.join(__dirname, 'package.json');
    if (fs.existsSync(pkgPath)) {
      log('✓', 'package.json found', 'green');
    }
  } else {
    log('✗', 'node_modules not installed - run: npm install', 'red');
  }

  // Check database files
  section('Database Setup');
  const dbDir = path.join(__dirname, '../database');
  if (fs.existsSync(dbDir)) {
    const sqlFiles = fs.readdirSync(dbDir).filter(f => f.endsWith('.sql')).sort();
    if (sqlFiles.length > 0) {
      log('✓', `Found ${sqlFiles.length} migration files:`, 'green');
      sqlFiles.forEach(f => console.log(`    - ${f}`));
    } else {
      log('✗', 'No SQL migration files found', 'red');
    }
  } else {
    log('✗', 'Database directory not found', 'red');
  }

  // Check uploads directory
  section('File Storage');
  const uploadsPath = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsPath)) {
    log('✓', 'Uploads directory exists', 'green');
    const photosPath = path.join(uploadsPath, 'photos');
    if (fs.existsSync(photosPath)) {
      log('✓', 'Photos directory accessible', 'green');
    } else {
      log('⚠', 'Photos directory missing (will be created on first upload)', 'yellow');
    }
  } else {
    log('⚠', 'Uploads directory not found (will be created on startup)', 'yellow');
  }

  // Check logs directory
  const logsPath = path.join(__dirname, 'logs');
  if (fs.existsSync(logsPath)) {
    log('✓', 'Logs directory exists', 'green');
  } else {
    log('⚠', 'Logs directory not found (will be created on startup)', 'yellow');
  }

  // Check main entry point
  section('Application Files');
  const srcPath = path.join(__dirname, 'src');
  if (fs.existsSync(srcPath)) {
    log('✓', 'src directory exists', 'green');
    const indexPath = path.join(srcPath, 'index.ts');
    if (fs.existsSync(indexPath)) {
      log('✓', 'Main entry point (index.ts) found', 'green');
    } else {
      log('✗', 'Main entry point not found', 'red');
    }
  } else {
    log('✗', 'src directory not found', 'red');
  }

  // Provide next steps
  section('Next Steps');
  console.log(`
1. Ensure PostgreSQL is running locally on localhost:5432
2. Run: npm install (if node_modules is missing)
3. Run: npm run migrate (to set up database schema)
4. Run: npm run seed (to add test data)
5. Run: npm run dev (to start the server)

The backend should be available at: http://localhost:3001
Try the health endpoint: curl http://localhost:3001/health

Test credentials:
  Email: admin@healthark.co.uk
  Password: Admin1234
  `);

  section('Logs');
  const errorLogPath = path.join(__dirname, 'logs/error.log');
  if (fs.existsSync(errorLogPath)) {
    const content = fs.readFileSync(errorLogPath, 'utf8');
    if (content.length > 0) {
      log('⚠', 'Error log has entries (check logs/error.log)', 'yellow');
    }
  }

  console.log(`\n${colors.blue}═══════════════════════════════════${colors.reset}\n`);
}

main().catch(console.error);
