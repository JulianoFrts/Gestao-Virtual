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

test.describe('Gestão de Empresas', () => {

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/admin/companies');
    await waitForModuleLoad(page);
  });

  test('Deve exibir lista de empresas', async ({ page }) => {
    const title = page.locator('h1');
    await expect(title).toContainText('Gestão de Empresas');
    const cards = page.locator('.glass-card');
    if (await cards.count() > 0) {
      console.log(`✅ ${await cards.count()} empresas encontradas`);
    }
    await captureScreenshot(page, 'empresas-lista');
  });

  test('Deve cadastrar nova empresa', async ({ page }) => {
    const testData = generateTestData();
    console.log('🏗️ Criando nova empresa...');

    await openCreateModal(page, 'Nova Empresa');

    // Preencher campos (usando placeholder conforme Companies.tsx)
    await page.locator('input[placeholder*="Nono Engenharia"]').fill(testData.companyName);
    await page.locator('input[placeholder*="00.000.000"]').fill(testData.cnpj);
    await page.locator('input[placeholder*="Logradouro"]').fill('Rua de Teste, 123');
    await page.locator('input[placeholder*="(00) 0000"]').fill('11999999999');

    await clickButton(page, 'Cadastrar Empresa');
    await expectSuccessToast(page);
    console.log('✅ Empresa cadastrada com sucesso');
  });

  test('Deve buscar empresa por nome', async ({ page }) => {
    const testData = generateTestData();
    const companyName = `Busca_${testData.companyName}`;

    console.log(`🔍 Testando busca por: ${companyName}`);

    // Criar uma empresa para garantir que ela existe
    await openCreateModal(page, 'Nova Empresa');
    await page.locator('input[placeholder*="Nono Engenharia"]').fill(companyName);
    await clickButton(page, 'Cadastrar Empresa');
    await expectSuccessToast(page);

    // Buscar
    const searchInput = page.locator('input[placeholder*="Buscar empresas"], input[type="search"]').first();
    await searchInput.fill(companyName);
    await page.waitForTimeout(1000);

    // Verificar se ela aparece
    const cards = page.locator('.glass-card');
    await expect(cards).toContainText(companyName);
    console.log('✅ Busca concluída com sucesso');
  });

  test('Deve abrir detalhes da empresa', async ({ page }) => {
    console.log('👁️ Testando visualização de detalhes...');

    // Localizar o primeiro card
    const firstCard = page.locator('.glass-card').first();
    await firstCard.hover(); // Mostrar botões

    // Clicar no primeiro botão de visualizar (Pencil ou ícone de ação)
    const viewButton = firstCard.locator('button:has(svg), [aria-label*="visualizar" i]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForTimeout(1000);
      await captureScreenshot(page, 'empresas-detalhes');
      console.log('✅ Detalhes exibidos');
    }
  });

  test('Deve excluir uma empresa', async ({ page }) => {
    console.log('🗑️ Testando exclusão de empresa...');

    // Localizar o primeiro card
    const firstCard = page.locator('.glass-card').first();
    await firstCard.hover();

    // Localizar o botão de excluir (Trash2 icon)
    const deleteButton = firstCard.locator('button:has(svg[class*="trash"]), [aria-label*="excluir" i]').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirmar no diálogo
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("Excluir")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await expectSuccessToast(page);
        console.log('✅ Empresa excluída com sucesso');
      }
    }
  });
});
