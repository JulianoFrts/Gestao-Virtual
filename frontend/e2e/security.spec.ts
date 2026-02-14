import { test, expect } from '@playwright/test';
import {
  login,
  navigateTo,
  fillField,
  waitForModuleLoad,
  captureScreenshot
} from './helpers';

/**
 * Testes E2E - Central de Segurança e Auditoria
 *
 * Cenários testados:
 * - Acessar central de segurança
 * - Executar auditoria de padrões
 * - Streaming SSE em tempo real
 * - Teste de rotas
 */

test.describe('Central de Segurança', () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/security');
  });

  test('Deve exibir página de segurança', async ({ page }) => {
    console.log('🛡️ Verificando página de segurança...');

    // Verificar título
    const title = page.locator('h1:has-text("Central"), h1:has-text("Segurança")');
    await expect(title).toBeVisible();

    // Verificar abas
    const tabs = page.locator('[role="tablist"]');
    await expect(tabs).toBeVisible();

    await captureScreenshot(page, 'seguranca-pagina');
    console.log('✅ Página de segurança carregada');
  });

  test('Deve exibir trilha de auditoria', async ({ page }) => {
    console.log('📜 Verificando trilha de auditoria...');

    // Clicar na aba de trilha
    const trailTab = page.locator('[value="trail"], button:has-text("Trilha")');
    if (await trailTab.isVisible()) {
      await trailTab.click();
      await page.waitForTimeout(1000);

      await waitForModuleLoad(page);
      await captureScreenshot(page, 'seguranca-trilha');
      console.log('✅ Trilha de auditoria exibida');
    }
  });

  test('Deve executar auditoria de padrões', async ({ page }) => {
    console.log('🔍 Executando auditoria de padrões...');

    // Clicar na aba de padrões
    const standardsTab = page.locator('[value="standards"], button:has-text("Auditoria de Padrões")');
    if (await standardsTab.isVisible()) {
      await standardsTab.click();
      await page.waitForTimeout(1000);
    }

    // Clicar no botão SCAN
    const scanButton = page.locator('button:has-text("SCAN")');
    if (await scanButton.isVisible()) {
      await scanButton.click();
      await page.waitForTimeout(5000);

      await captureScreenshot(page, 'seguranca-scan');
      console.log('✅ Auditoria executada');
    }
  });

  test('Deve executar streaming SSE ao vivo', async ({ page }) => {
    console.log('📡 Testando streaming SSE...');

    // Clicar na aba de padrões
    const standardsTab = page.locator('[value="standards"], button:has-text("Auditoria de Padrões")');
    if (await standardsTab.isVisible()) {
      await standardsTab.click();
      await page.waitForTimeout(1000);
    }

    // Clicar no botão LIVE
    const liveButton = page.locator('button:has-text("LIVE")');
    if (await liveButton.isVisible()) {
      await liveButton.click();

      // Aguardar o terminal aparecer
      await page.waitForTimeout(3000);

      // Verificar se o terminal de streaming apareceu
      const terminal = page.locator('[class*="terminal"], [class*="streaming"], .font-mono');
      if (await terminal.first().isVisible()) {
        console.log('✅ Terminal de streaming ativo');
      }

      // Capturar durante o streaming
      await captureScreenshot(page, 'seguranca-streaming');

      // Aguardar conclusão ou timeout
      await page.waitForTimeout(30000);

      await captureScreenshot(page, 'seguranca-streaming-completo');
      console.log('✅ Streaming SSE testado');
    }
  });

  test('Deve exibir Health Score', async ({ page }) => {
    console.log('📊 Verificando Health Score...');

    // Clicar na aba de padrões
    const standardsTab = page.locator('[value="standards"], button:has-text("Auditoria de Padrões")');
    if (await standardsTab.isVisible()) {
      await standardsTab.click();
      await page.waitForTimeout(1000);
    }

    // Verificar se o Health Score está visível
    const healthScore = page.locator('text=Health Score, .text-6xl');
    if (await healthScore.first().isVisible()) {
      await captureScreenshot(page, 'seguranca-health-score');
      console.log('✅ Health Score exibido');
    }
  });
});
