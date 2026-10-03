const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/web',
  testMatch: '**/*.spec.cjs',
  timeout: 20000,
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 900 } } },
    { name: 'phone', use: { browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } }
  ],
  webServer: {
    command: 'node tests/web/server.cjs',
    url: 'http://127.0.0.1:4187/__health',
    reuseExistingServer: false,
    timeout: 10000
  }
});
