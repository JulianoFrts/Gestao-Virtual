import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    video: 'on',
    screenshot: 'on',
    permissions: ['geolocation', 'camera', 'microphone', 'notifications'],
    headless: true, // IMPORTANTE: mantém o navegador visível
    viewport: { width: 1920, height: 1080 }, // Tela grande
    launchOptions: {
      slowMo: 1300, // Adiciona delay de 300ms entre ações para visualização
      args: ['--start-maximized'] // Abre maximizado
    }
  },

  outputDir: 'e2e-results/',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  webServer: {
    command: 'npm run dev:playwright',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI
  }
})
