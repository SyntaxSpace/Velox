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
        Authorization: `Bearer ${TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
    };
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
  console.log('Fetching issues for repo:', REPO);
  try {
    const issues = await apiRequest('/issues?state=all&per_page=100');
    console.log(`Successfully fetched ${issues.length} issues.`);
    const issueList = issues.map((iss) => ({
      number: iss.number,
      title: iss.title,
      state: iss.state,
      labels: iss.labels.map((l) => l.name),
      milestone: iss.milestone ? iss.milestone.title : null,
    }));
    console.log(JSON.stringify(issueList, null, 2));
  } catch (err) {
    console.error('Error fetching issues:', err.message);
  }
}

run();
