import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  // 백엔드에 CORS 설정이 없어 개발 서버가 같은 출처로 요청을 넘겨준다
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': apiTarget,
        '/auth': apiTarget,
      },
    },
  }
})
