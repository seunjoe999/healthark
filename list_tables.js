const { Pool } = require('./backend/node_modules/pg');
const pool = new Pool({ host:'localhost', port:5432, database:'healthark', user:'postgres', password:'adeniji1234' });
pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")
  .then(r => { console.log(r.rows.map(x=>x.tablename).join('\n')); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
