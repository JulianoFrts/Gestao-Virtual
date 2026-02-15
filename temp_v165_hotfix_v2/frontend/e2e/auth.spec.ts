import { test, expect } from '@playwright/test';
import {
  login,
  navigateTo,
  fillField,
  clickButton,
  expectSuccessToast,
  waitForModuleLoad,
  captureScreenshot,
  BASE_URL
} from './helpers';

/**
 * Testes E2E - Fluxo de Autenticação
 *
 * Cenários testados:
 * - Login com credenciais válidas
 * - Login com credenciais inválidas
 * - Logout
 * - Proteção de rotas
 */

test.describe('Autenticação', () => {
  test.setTimeout(30000);

  test('Deve realizar login com sucesso', async ({ page }) => {
    console.log('🔐 Testando login válido...');

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Preencher credenciais
    await fillField(page, 'input[type="email"]', 'admin@gestaovirtual.com');
    await fillField(page, 'input[type="password"]', 'admin123');

    await captureScreenshot(page, 'auth-login-preenchido');

    // Clicar em login
    await clickButton(page, 'Entrar');

    // Aguardar redirecionamento
    await page.waitForTimeout(3000);

    // Verificar se foi redirecionado (não está mais em /login)
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/login');

    await captureScreenshot(page, 'auth-login-sucesso');
    console.log('✅ Login realizado com sucesso');
  });

  test('Deve exibir erro com credenciais inválidas', async ({ page }) => {
    console.log('❌ Testando login inválido...');

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Preencher credenciais inválidas
    await fillField(page, 'input[type="email"]', 'invalido@teste.com');
    await fillField(page, 'input[type="password"]', 'senha_errada');

    // Clicar em login
    await clickButton(page, 'Entrar');

    await page.waitForTimeout(2000);

    // Verificar mensagem de erro ou que continua em /login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');

    await captureScreenshot(page, 'auth-login-erro');
    console.log('✅ Erro de login exibido corretamente');
  });

  test('Deve realizar logout', async ({ page }) => {
    console.log('🚪 Testando logout...');

    // Fazer login primeiro
    await login(page);

    // Procurar botão de logout (geralmente em menu de usuário)
    const userMenu = page.locator('[aria-label*="usuário" i], [aria-label*="perfil" i], button:has(img), button:has(.avatar)').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
      await page.waitForTimeout(500);

      const logoutButton = page.locator('button:has-text("Sair"), button:has-text("Logout")').first();
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        await page.waitForTimeout(2000);

        // Verificar redirecionamento para login
        expect(page.url()).toContain('/login');

        await captureScreenshot(page, 'auth-logout');
        console.log('✅ Logout realizado');
      }
    }
  });

  test('Deve proteger rotas sem autenticação', async ({ page }) => {
    console.log('🛡️ Testando proteção de rotas...');

    // Tentar acessar rota protegida sem login
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    // Deve redirecionar para login
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');

    await captureScreenshot(page, 'auth-protecao-rotas');
    console.log('✅ Rotas protegidas corretamente');

    await page.waitForTimeout(2000);
    page.click('button:has-text("Começar Agora")');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(2000);

    await captureScreenshot(page, 'auth-protecao-rotas');
    console.log('✅ Rotas protegidas corretamente');

    // 3. Clicar no para desbçpqiear ér,ossopms
    console.log('🚀 Realizando checkPermission-Open...');
    const loginButton = page.locator('button[type="submit"], button:has-text("Começar Agora"), button:has-text("Começar Agora")').first();
    await loginButton.click();
    await page.waitForTimeout(1500);



  });
});
