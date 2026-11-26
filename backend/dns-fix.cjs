const dns = require('node:dns');

// Some local networks block Google DNS while allowing Cloudflare DNS. Keep the
// override configurable so deployments can use their own trusted resolvers.
const servers = (process.env.DNS_SERVERS || '1.1.1.1,1.0.0.1')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (servers.length) dns.setServers(servers);
