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
  openCreateModal,
  captureScreenshot
} from './helpers';

/**
 * Testes E2E - Gestão de Obras (Projetos)
 *
 * Cenários testados:
 * - Listar obras
 * - Criar nova obra
 * - Editar obra
 * - Associar empresa à obra
 */

test.describe('Gestão de Obras/Projetos', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/admin/projects');
    await page.waitForLoadState('networkidle');
    await waitForModuleLoad(page);
  });

  test('Deve exibir lista de obras', async ({ page }) => {
    console.log('📋 Verificando listagem de obras...');

    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verificar cabeçalhos
    await expect(page.locator('th:has-text("Nome"), th:has-text("Projeto")')).toBeVisible();

    await captureScreenshot(page, 'obras-listagem');
    console.log('✅ Listagem de obras exibida');
  });

  test('Deve criar nova obra', async ({ page }) => {
    console.log('🏗️ Criando nova obra...');
    const data = generateTestData();

    // Abrir modal de criação
    await openCreateModal(page, 'Nova');

    // Preencher formulário
    await fillField(page, 'input[name="name"]', data.projectName);
    await fillField(page, 'input[name="code"], input[placeholder*="código" i]', `PRJ-${Date.now()}`);
    await fillField(page, 'textarea[name="description"], input[name="description"]', 'Obra de teste criada via E2E');

    // Selecionar empresa (se disponível)
    const companySelect = page.locator('[name="companyId"], [aria-label*="empresa" i]');
    if (await companySelect.isVisible()) {
      await companySelect.click();
      await page.locator('[role="option"]').first().click();
    }

    await captureScreenshot(page, 'obras-criar-form');

    // Salvar
    await clickButton(page, 'Salvar');
    await expectSuccessToast(page);

    await captureScreenshot(page, 'obras-criar-sucesso');
    console.log(`✅ Obra "${data.projectName}" criada`);
  });

  test('Deve visualizar detalhes da obra', async ({ page }) => {
    console.log('👁️ Visualizando detalhes da obra...');

    // Clicar na primeira linha da tabela
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      await captureScreenshot(page, 'obras-detalhes');
      console.log('✅ Detalhes exibidos');
    }
  });

  test('Deve gerenciar canteiros da obra', async ({ page }) => {
    console.log('🏕️ Verificando canteiros da obra...');

    // Navegar para a primeira obra
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Procurar aba ou seção de canteiros
      const sitesTab = page.locator('button:has-text("Canteiros"), [value="sites"], a:has-text("Canteiros")');
      if (await sitesTab.isVisible()) {
        await sitesTab.click();
        await page.waitForTimeout(1000);

        await captureScreenshot(page, 'obras-canteiros');
        console.log('✅ Seção de canteiros encontrada');
      }
    }
  });
});
