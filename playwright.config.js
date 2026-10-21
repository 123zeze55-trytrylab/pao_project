import {defineConfig} from '@playwright/test'
export default defineConfig({testDir:'./tests',testMatch:'browser.spec.js',use:{baseURL:'http://127.0.0.1:5173',viewport:{width:390,height:844},launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']}},workers:1})
