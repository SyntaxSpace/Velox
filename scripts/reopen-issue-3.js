const https = require('https');

const TOKEN = process.env.GITHUB_TOKEN || '';
const REPO = 'SyntaxSpace/Velox';

function apiRequest(path, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const dataString = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}${path}`,
      method: method,
      headers: {
        'User-Agent': 'Velox-Auditor',
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };
    if (TOKEN) {
      options.headers['Authorization'] = `Bearer ${TOKEN}`;
    }
    if (dataString) {
      options.headers['Content-Length'] = Buffer.byteLength(dataString);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            resolve(data);
          }
        } else {
          try {
            const parsed = JSON.parse(data);
            reject(new Error(`API Error [${res.statusCode}]: ${parsed.message || data}`));
          } catch (e) {
            reject(new Error(`API Error [${res.statusCode}]: ${data}`));
          }
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (dataString) req.write(dataString);
    req.end();
  });
}

async function run() {
  console.log('Reopening Issue #3 for repo:', REPO);
  const comment = `**Reopened in Day 7 Audit**:
Acceptance criterion 5 for Issue #3 requires a verified migration run against a live PostgreSQL instance (\`npx prisma migrate dev --name init\`).
While \`prisma/schema.prisma\` is fully defined, includes Day 7 multi-shop models (\`publicShopId\`, \`ownerId\`, optional \`userId\`, \`guestSessionId\`), and generates cleanly via \`npx prisma generate\`, the local environment did not run the migration against an active PostgreSQL Docker/managed service.

Issue #3 is reopened and marked as **BLOCKED on live database deployment**.`;

  try {
    if (!TOKEN) {
      console.log('GITHUB_TOKEN not set in environment. Issue #3 reconciliation recorded locally.');
      console.log('Reconciliation note:\n' + comment);
      return;
    }

    // 1. Post comment
    await apiRequest('/issues/3/comments', 'POST', { body: comment });
    console.log('Added comment to Issue #3.');

    // 2. Reopen issue
    await apiRequest('/issues/3', 'PATCH', { state: 'open' });
    console.log('Reopened Issue #3 successfully.');
  } catch (err) {
    console.error('Error modifying Issue #3:', err.message);
  }
}

run();
