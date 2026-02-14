import { test, expect } from '@playwright/test';

/**
 * Teste Visual do Frontend ORION
 *
 * Este teste abre o navegador em modo visível (headless: false) para que
 * você possa assistir em tempo real:
 * 1. Login no sistema
 * 2. Navegação até Central de Segurança
 * 3. Execução do streaming SSE de auditoria
 *
 * Para executar:
 * npx playwright test visual.spec.ts --headed --project=chromium
 */

test.describe('ORION - Teste Visual em Tempo Real', () => {

  // Configuração: aumentar tempo de espera para visualização
  test.setTimeout(120000); // 2 minutos

  test('Login e Streaming SSE de Auditoria', async ({ page }) => {
    // 1. Acessar página de login
    console.log('🌐 Abrindo página de login...');
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Aguardar elementos carregarem
    await page.waitForTimeout(2000);

    // 2. Preencher credenciais de login
    // ATENÇÃO: Ajuste as credenciais conforme necessário
    console.log('🔐 Preenchendo credenciais...');

    // Tentar localizar campo de email/usuário
    const emailField = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i], input[placeholder*="usuário" i]').first();
    if (await emailField.isVisible()) {
      await emailField.fill('admin@gestaivirtual.com');
    }

    // Localizar campo de senha
    const passwordField = page.locator('input[type="password"]').first();
    if (await passwordField.isVisible()) {
      await passwordField.fill('admin123');
    }

    // Aguardar um momento para visualização
    await page.waitForTimeout(1500);

    // 3. Clicar no botão de login
    console.log('🚀 Realizando login...');
    const loginButton = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Login")').first();
    await loginButton.click();
    await page.waitForTimeout(1500);

    // Aguardar redirecionamento
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');


    // 4. Navegar para Central de Segurança
    console.log('🛡️ Navegando para Central de Segurança...');
    await page.goto('http://localhost:5173/security');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 5. Clicar na aba "Auditoria de Padrões"
    console.log('📋 Abrindo aba Auditoria de Padrões...');
    const standardsTab = page.locator('button:has-text("Auditoria de Padrões"), [value="standards"]');
    if (await standardsTab.isVisible()) {
      await standardsTab.click();
      await page.waitForTimeout(1500);
    }

    // 6. Clicar no botão LIVE para iniciar streaming
    console.log('📡 Iniciando streaming SSE...');
    const liveButton = page.locator('button:has-text("LIVE")');
    if (await liveButton.isVisible()) {
      await liveButton.click();

      // 7. Aguardar o streaming completar (ou timeout)
      console.log('⏳ Aguardando streaming completar...');

      // Aguardar até 60 segundos para o streaming completar
      await page.waitForTimeout(60000);
    }

    // Screenshot final
    console.log('📸 Capturando screenshot...');
    await page.screenshot({
      path: 'e2e-results/streaming-result.png',
      fullPage: true
    });

    console.log('✅ Teste concluído!');
  });

  test('Navegação Geral pelo Sistema', async ({ page }) => {
    // Teste simples de navegação
    console.log('🌐 Testando navegação geral...');

    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Screenshot da home
    await page.screenshot({
      path: 'e2e-results/home.png',
      fullPage: true
    });

    console.log('✅ Navegação testada!');
  });
});
