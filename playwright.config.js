import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir:'./tests', workers:1, reporter:'list',
  use:{baseURL:process.env.BRAIN10_TEST_URL || 'http://127.0.0.1:4176',channel:'msedge',headless:true,locale:'vi-VN',timezoneId:'Asia/Ho_Chi_Minh',screenshot:'only-on-failure'},
  webServer:process.env.BRAIN10_TEST_URL ? undefined : {command:'node server.mjs',env:{PORT:'4176'},url:'http://127.0.0.1:4176/try/',reuseExistingServer:true}
});
