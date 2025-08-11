import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: '/FFXIV-PvP-calculating-machine/', // 리포 이름
})
