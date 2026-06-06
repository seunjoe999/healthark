const { Client } = require('ssh2');

const conn = new Client();

conn.on('ready', () => {
  console.log('Connected!');
  const WP = '/homepages/3/d954356341/htdocs/Comprehensive/Comprehensive/homedir/public_html';
  const cmd = [
    `echo "=== HOMEDIR WP-CONFIG FULL ==="`,
    `grep -v "^\s*//" ${WP}/wp-config.php | grep -v "^$"`,
  ].join(' && ');
  conn.exec(cmd, (err, stream) => {
    if (err) { console.error('Exec error:', err.message); conn.end(); return; }
    stream.on('data', d => process.stdout.write(d.toString()));
    stream.stderr.on('data', d => process.stderr.write(d.toString()));
    stream.on('close', () => { console.log('\nDone.'); conn.end(); });
  });
}).connect({
  host: 'access954356341.webspace-data.io',
  port: 22,
  username: 'u111498889',
  password: 'March@2005',
  readyTimeout: 15000,
});
