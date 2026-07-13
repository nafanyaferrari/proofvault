const { chromium } = require('@playwright/test');
const os = require('node:os');
const path = require('node:path');

const port = Number(process.env.AGENT_BROWSER_CDP_PORT || 9224);
const profileDir = process.env.AGENT_BROWSER_PROFILE_DIR || path.join(os.tmpdir(), 'proofvault-agent-browser-profile');

let context;

async function shutdown() {
  if (context) {
    await context.close();
    context = undefined;
  }
}

async function main() {
  context = await chromium.launchPersistentContext(profileDir, {
    headless: process.env.AGENT_BROWSER_HEADED !== 'true',
    args: [`--remote-debugging-port=${port}`]
  });
  console.log(`agent-browser CDP ready on http://127.0.0.1:${port}`);
  console.log(`Use: npx agent-browser --cdp ${port} open http://127.0.0.1:5173`);
  await new Promise(resolve => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
  await shutdown();
}

main().catch(async error => {
  console.error(error);
  await shutdown();
  process.exit(1);
});
