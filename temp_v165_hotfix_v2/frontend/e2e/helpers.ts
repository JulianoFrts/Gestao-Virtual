import { test, expect, Page } from '@playwright/test';

/**
 * Helpers reutilizáveis para testes E2E
 */

// Credenciais de teste
export const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@gestaovirtual.com',
    password: 'admin123'
  },
  manager: {
    email: 'gerente@teste.com',
    password: 'Gerente@123'
  }
};

// URLs base
export const BASE_URL = 'http://localhost:5173';

/**
 * Faz login no sistema
 */
export async function login(page: Page, credentials = TEST_CREDENTIALS.admin) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState('networkidle');

  // Preencher email (id="email" em Auth.tsx)
  const emailField = page.locator('#email, input[id="email"], input[name="email"]').first();
  await emailField.fill(credentials.email);

  // Preencher senha (id="password" em Auth.tsx)
  const passwordField = page.locator('#password, input[id="password"], input[name="password"]').first();
  await passwordField.fill(credentials.password);

  // Clicar em login ("Entrar no Sistema" em Auth.tsx)
  const loginButton = page.locator('button[type="submit"], button:has-text("Entrar no Sistema")').first();
  await loginButton.click();

  // 1. Aguardar sumir a página de login
  await expect(page).not.toHaveURL(/.*\/login/);

  // 2. Aguardar a tela de Sincronização (LoadingScreen) aparecer e sumir
  console.log('⏳ Aguardando sincronização de dados (LoadingScreen)...');

  // Tenta esperar o LoadingScreen aparecer brevemente e depois sumir
  const loadingText = page.locator('text=Sincronização de Dados, text=Protocolo Orion v3').first();
  try {
    // Espera até 5s para o loading aparecer (pode ser instantâneo em dev)
    await loadingText.waitFor({ state: 'visible', timeout: 5000 });
    // Se apareceu, espera até 30s para sumir
    await loadingText.waitFor({ state: 'hidden', timeout: 30000 });
    console.log('✅ Sincronização concluída.');
  } catch (e) {
    console.log('ℹ️ Tela de sincronização não detectada ou já concluída.');
  }

  // 3. Lidar com o Modal de Boas-vindas/Permissões (Onboarding)
  const onboardingButton = page.locator('button:has-text("Permitir depois"), button:has-text("Continuar"), button:has-text("Pular"), button:has-text("Começar Agora")').first();
  try {
    // Espera até 5s para o modal aparecer
    if (await onboardingButton.isVisible({ timeout: 5000 })) {
      console.log('👋 Dispensando modal de boas-vindas...');
      // Usar force: true para garantir o clique mesmo se houver algo na frente (como o toast)
      await onboardingButton.click({ force: true });
      await page.waitForTimeout(500);
    }
  } catch (e) {
    console.log('ℹ️ Modal de boas-vindas não apareceu.');
  }

  // 4. Garantir que estamos no dashboard ou página protegida
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Navega para uma página específica
 */
export async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Preenche um campo de formulário
 */
export async function fillField(page: Page, selector: string, value: string) {
  const field = page.locator(selector).first();
  await field.clear();
  await field.fill(value);
}

/**
 * Clica em um botão por texto
 */
export async function clickButton(page: Page, text: string) {
  const button = page.locator(`button:has-text("${text}")`).first();
  await button.click();
  await page.waitForTimeout(500);
}

/**
 * Seleciona uma opção em um select
 */
export async function selectOption(page: Page, selector: string, value: string) {
  const select = page.locator(selector).first();
  await select.click();
  await page.waitForTimeout(300);
  await page.locator(`[role="option"]:has-text("${value}")`).first().click();
  await page.waitForTimeout(300);
}

/**
 * Verifica se um toast de sucesso aparece
 */
export async function expectSuccessToast(page: Page, message?: string) {
  const toast = page.locator('[data-sonner-toast][data-type="success"], .sonner-toast');
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
  if (message) {
    await expect(toast.first()).toContainText(message);
  }
}

/**
 * Verifica se um toast de erro aparece
 */
export async function expectErrorToast(page: Page) {
  const toast = page.locator('[data-sonner-toast][data-type="error"], .sonner-toast');
  await expect(toast.first()).toBeVisible({ timeout: 5000 });
}

/**
 * Gera dados aleatórios para testes
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    companyName: `Empresa Teste ${timestamp}`,
    cnpj: `${Math.floor(Math.random() * 99999999999999).toString().padStart(14, '0')}`,
    employeeName: `Funcionário Teste ${timestamp}`,
    email: `teste_${timestamp}@teste.com`,
    cpf: `${Math.floor(Math.random() * 99999999999).toString().padStart(11, '0')}`,
    projectName: `Obra Teste ${timestamp}`,
    siteName: `Canteiro Teste ${timestamp}`,
  };
}

/**
 * Aguarda o carregamento de um módulo (Tabela ou Grid de Cards)
 * lidando com a LoadingScreen.
 */
export async function waitForModuleLoad(page: Page) {
  // 1. Aguardar a LoadingScreen sumir se ela estiver visível
  const loadingScreen = page.locator('div:has-text("SINCRONIZAÇÃO DADOS"), .animate-pulse').first();
  try {
    if (await loadingScreen.isVisible({ timeout: 2000 })) {
      await loadingScreen.waitFor({ state: 'hidden', timeout: 30000 });
    }
  } catch (e) {
    // Se não apareceu ou deu timeout sumindo, continua
  }

  // 2. Aguardar ou uma tabela ou um card de conteúdo aparecer
  const tableRow = page.locator('table tbody tr');
  const cardItem = page.locator('.glass-card, .card');

  await Promise.race([
    tableRow.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {}),
    cardItem.first().waitFor({ state: 'visible', timeout: 10000 }).catch(() => {})
  ]);

  await page.waitForTimeout(500);
}

/**
 * Abre modal de criação
 */
export async function openCreateModal(page: Page, buttonText: string = 'Novo') {
  await clickButton(page, buttonText);
  await page.waitForTimeout(500);
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

/**
 * Fecha modal
 */
export async function closeModal(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Captura screenshot com nome descritivo
 */
export async function captureScreenshot(page: Page, name: string) {
  await page.screenshot({
    path: `e2e-results/screenshots/${name}.png`,
    fullPage: true
  });
}
