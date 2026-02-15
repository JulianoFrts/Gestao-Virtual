import { test, expect } from '@playwright/test';
import {
  login,
  navigateTo,
  fillField,
  clickButton,
  expectSuccessToast,
  generateTestData,
  waitForModuleLoad,
  openCreateModal,
  captureScreenshot
} from './helpers';

/**
 * Testes E2E - Gestão de Canteiros
 *
 * Cenários testados:
 * - Listar canteiros
 * - Criar novo canteiro
 * - Associar canteiro a obra
 * - Gerenciar equipes do canteiro
 */

test.describe('Gestão de Canteiros', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/admin/sites');
    await waitForModuleLoad(page);
  });

  test('Deve exibir lista de canteiros', async ({ page }) => {
    console.log('📋 Verificando listagem de canteiros...');

    const table = page.locator('table');
    await expect(table).toBeVisible();

    await captureScreenshot(page, 'canteiros-listagem');
    console.log('✅ Listagem de canteiros exibida');
  });

  test('Deve criar novo canteiro', async ({ page }) => {
    console.log('🏕️ Criando novo canteiro...');
    const data = generateTestData();

    // Abrir modal de criação
    await openCreateModal(page, 'Novo');

    // Preencher formulário
    await fillField(page, 'input[name="name"]', data.siteName);
    await fillField(page, 'input[name="code"], input[placeholder*="código" i]', `SITE-${Date.now()}`);

    // Selecionar projeto (se disponível)
    const projectSelect = page.locator('[name="projectId"], [aria-label*="projeto" i], [aria-label*="obra" i]');
    if (await projectSelect.isVisible()) {
      await projectSelect.click();
      await page.locator('[role="option"]').first().click();
    }

    await captureScreenshot(page, 'canteiros-criar-form');

    // Salvar
    await clickButton(page, 'Salvar');
    await expectSuccessToast(page);

    await captureScreenshot(page, 'canteiros-criar-sucesso');
    console.log(`✅ Canteiro "${data.siteName}" criado`);
  });

  test('Deve visualizar equipes do canteiro', async ({ page }) => {
    console.log('👥 Verificando equipes do canteiro...');

    // Clicar no primeiro canteiro
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible()) {
      await firstRow.click();
      await page.waitForTimeout(1000);

      // Procurar aba de equipes
      const teamsTab = page.locator('button:has-text("Equipes"), [value="teams"]');
      if (await teamsTab.isVisible()) {
        await teamsTab.click();
        await page.waitForTimeout(1000);

        await captureScreenshot(page, 'canteiros-equipes');
        console.log('✅ Seção de equipes encontrada');
      }
    }
  });

  test('Deve editar canteiro', async ({ page }) => {
    console.log('✏️ Editando canteiro...');

    // Clicar no botão de editar
    const editButton = page.locator('button:has-text("Editar")').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Modificar nome
      await fillField(page, 'input[name="name"]', 'Canteiro Editado');

      await captureScreenshot(page, 'canteiros-editar');

      // Salvar
      await clickButton(page, 'Salvar');
      await expectSuccessToast(page);

      console.log('✅ Canteiro editado');
    }
  });
});
