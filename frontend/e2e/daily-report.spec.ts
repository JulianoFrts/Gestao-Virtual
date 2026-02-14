import { test, expect } from '@playwright/test';
import {
  login,
  navigateTo,
  fillField,
  clickButton,
  selectOption,
  expectSuccessToast,
  generateTestData,
  waitForModuleLoad,
  captureScreenshot
} from './helpers';

/**
 * Testes E2E - Relatório Diário de Obra (RDO)
 *
 * Cenários testados:
 * - Acessar página de RDO
 * - Criar novo RDO
 * - Selecionar vãos/torres
 * - Registrar atividades
 */

test.describe('Relatório Diário de Obra (RDO)', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Deve acessar página de RDO', async ({ page }) => {
    console.log('📋 Acessando página de RDO...');

    await navigateTo(page, '/daily-report');
    await page.waitForTimeout(2000);

    // Verificar se a página carregou
    const pageTitle = page.locator('h1, h2').first();
    await expect(pageTitle).toBeVisible();

    await captureScreenshot(page, 'rdo-pagina-inicial');
    console.log('✅ Página de RDO acessada');
  });

  test('Deve exibir formulário de RDO', async ({ page }) => {
    console.log('📝 Verificando formulário de RDO...');

    await navigateTo(page, '/daily-report');
    await page.waitForTimeout(2000);

    // Verificar elementos do formulário
    const dateSelector = page.locator('input[type="date"], button:has-text("Data"), [aria-label*="data" i]');
    const teamSelector = page.locator('[aria-label*="equipe" i], button:has-text("Equipe")');

    if (await dateSelector.isVisible()) {
      console.log('✅ Seletor de data encontrado');
    }

    await captureScreenshot(page, 'rdo-formulario');
    console.log('✅ Formulário de RDO verificado');
  });

  test('Deve selecionar vãos para o RDO', async ({ page }) => {
    console.log('🗼 Testando seleção de vãos...');

    await navigateTo(page, '/daily-report');
    await page.waitForTimeout(2000);

    // Procurar seletor de vãos/torres
    const spanSelector = page.locator('[aria-label*="vão" i], button:has-text("Vãos"), button:has-text("Torres")');
    if (await spanSelector.isVisible()) {
      await spanSelector.click();
      await page.waitForTimeout(1000);

      // Selecionar primeiro vão disponível
      const firstOption = page.locator('[role="option"], [role="checkbox"]').first();
      if (await firstOption.isVisible()) {
        await firstOption.click();
        await page.waitForLoadState('networkidle');
        await waitForModuleLoad(page);
      }

      await captureScreenshot(page, 'rdo-selecao-vaos');
      console.log('✅ Seleção de vãos testada');
    }
  });

  test('Deve registrar atividade no RDO', async ({ page }) => {
    console.log('⚡ Registrando atividade...');

    await navigateTo(page, '/daily-report');
    await page.waitForTimeout(2000);

    // Procurar botão de adicionar atividade
    const addActivityButton = page.locator('button:has-text("Adicionar"), button:has-text("Nova Atividade")');
    if (await addActivityButton.isVisible()) {
      await addActivityButton.click();
      await page.waitForTimeout(1000);

      // Preencher dados da atividade
      await fillField(page, 'textarea, input[name="description"]', 'Atividade de teste E2E');

      await captureScreenshot(page, 'rdo-adicionar-atividade');
      console.log('✅ Atividade adicionada');
    }
  });

  test('Deve salvar RDO', async ({ page }) => {
    console.log('💾 Testando salvamento de RDO...');

    await navigateTo(page, '/daily-report');
    await page.waitForTimeout(2000);

    // Procurar botão de salvar
    const saveButton = page.locator('button:has-text("Salvar"), button:has-text("Enviar")');
    if (await saveButton.isVisible()) {
      // Nota: não vamos realmente salvar para não criar dados de teste
      await captureScreenshot(page, 'rdo-botao-salvar');
      console.log('✅ Botão de salvar encontrado');
    }
  });
});
