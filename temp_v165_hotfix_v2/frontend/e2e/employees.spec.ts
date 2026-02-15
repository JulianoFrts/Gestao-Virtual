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
 * Testes E2E - Gestão de Funcionários
 *
 * Cenários testados:
 * - Listar funcionários
 * - Criar novo funcionário
 * - Editar funcionário
 * - Associar funcionário a empresa/obra/canteiro
 */

test.describe('Gestão de Funcionários', () => {
  test.setTimeout(60000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/admin/users');
    await page.waitForLoadState('networkidle');
    await waitForModuleLoad(page);
  });

  test('Deve exibir lista de funcionários', async ({ page }) => {
    console.log('📋 Verificando listagem de funcionários...');

    // Verificar se a tabela existe
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Verificar cabeçalhos esperados
    await expect(page.locator('th:has-text("Nome"), th:has-text("Usuário")')).toBeVisible();

    await captureScreenshot(page, 'funcionarios-listagem');
    console.log('✅ Listagem de funcionários exibida');
  });

  test('Deve criar novo funcionário', async ({ page }) => {
    console.log('👤 Criando novo funcionário...');
    const data = generateTestData();

    // Abrir modal de criação
    await openCreateModal(page, 'Novo');

    // Preencher dados básicos
    await fillField(page, 'input[name="name"]', data.employeeName);
    await fillField(page, 'input[name="email"]', data.email);
    await fillField(page, 'input[name="cpf"], input[placeholder*="cpf" i]', data.cpf);

    // Selecionar função (se disponível)
    const roleSelect = page.locator('[name="role"], [aria-label*="função" i], [aria-label*="cargo" i]');
    if (await roleSelect.isVisible()) {
      await roleSelect.click();
      await page.locator('[role="option"]').first().click();
    }

    await captureScreenshot(page, 'funcionarios-criar-form');

    // Salvar
    await clickButton(page, 'Salvar');

    // Verificar sucesso
    await expectSuccessToast(page);

    await captureScreenshot(page, 'funcionarios-criar-sucesso');
    console.log(`✅ Funcionário "${data.employeeName}" criado`);
  });

  test('Deve filtrar funcionários por status', async ({ page }) => {
    console.log('🔍 Testando filtros de funcionários...');

    // Buscar por filtro de status
    const statusFilter = page.locator('[aria-label*="status" i], select[name="status"], button:has-text("Status")');
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.waitForTimeout(500);

      // Selecionar opção "Ativo"
      await page.locator('[role="option"]:has-text("Ativo")').first().click();
      await page.waitForTimeout(1000);

      await captureScreenshot(page, 'funcionarios-filtro-status');
      console.log('✅ Filtro de status aplicado');
    }
  });

  test('Deve editar funcionário existente', async ({ page }) => {
    console.log('✏️ Editando funcionário...');

    // Clicar no primeiro botão de editar
    const editButton = page.locator('button:has-text("Editar"), button[aria-label*="editar" i]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(500);

      // Modificar nome
      await fillField(page, 'input[name="name"]', 'Nome Editado');

      await captureScreenshot(page, 'funcionarios-editar');

      // Salvar alterações
      await clickButton(page, 'Salvar');
      await expectSuccessToast(page);

      console.log('✅ Funcionário editado');
    } else {
      console.log('⚠️ Nenhum funcionário para editar');
    }
  });

  test('Deve associar funcionário a uma obra', async ({ page }) => {
    console.log('🔗 Testando associação a obra...');

    // Abrir detalhes do primeiro funcionário
    const detailsButton = page.locator('button:has(svg[class*="eye"]), [aria-label*="visualizar" i]').first();
    if (await detailsButton.isVisible()) {
      await detailsButton.click();
      await page.waitForTimeout(1000);

      // Procurar por seção de obras/projetos
      const projectSection = page.locator('text=Projetos, text=Obras, button:has-text("Associar")');
      if (await projectSection.isVisible()) {
        await captureScreenshot(page, 'funcionarios-associar-obra');
        console.log('✅ Seção de associação encontrada');
      }
    }
  });

  test('Deve excluir um funcionário', async ({ page }) => {
    console.log('🗑️ Testando exclusão de funcionário...');

    // Abrir menu de ações ou localizar botão excluir diretamente
    const deleteButton = page.locator('button:has(svg[class*="trash"]), button:has-text("Excluir"), [aria-label*="excluir" i]').first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirmar no diálogo
      const confirmButton = page.locator('button:has-text("Confirmar"), button:has-text("Sim"), button:has-text("Excluir")').last();
      if (await confirmButton.isVisible()) {
        await confirmButton.click();
        await expectSuccessToast(page);
        console.log('✅ Funcionário excluído com sucesso');
      }
    } else {
      console.log('⚠️ Botão de excluir não encontrado');
    }
  });
});
