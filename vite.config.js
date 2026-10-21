import {defineConfig,loadEnv} from 'vite'
import {deepseekPlugin} from './server/deepseek.js'
export default defineConfig(({mode})=>({plugins:[deepseekPlugin({...loadEnv(mode,process.cwd(),'DEEPSEEK_'),...Object.fromEntries(Object.entries(process.env).filter(([name])=>name.startsWith('DEEPSEEK_')))})],server:{host:'127.0.0.1'}}))
