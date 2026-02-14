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
 * Testes E2E - Fluxo de Onboarding Completo
 *
 * Este teste valida a jornada do administrador ao configurar uma nova estrutura:
 * 1. Login
 * 2. Criar uma nova Empresa
 * 3. Criar uma nova Obra (Projeto) vinculada à essa empresa
 * 4. Criar um novo Canteiro (Site) vinculado à essa obra
 * 5. Cadastrar um Funcionário e vinculá-lo ao sistema
 */

test.describe('Fluxo de Onboarding Completo', () => {
  test.setTimeout(180000); // 3 minutos para o fluxo completo

  test('Deve realizar o onboarding completo: Empresa -> Obra -> Canteiro -> Funcionário', async ({ page }) => {
    const data = generateTestData();

    // 1. Login
    console.log('🔐 Iniciando Login...');
    await login(page);
    await captureScreenshot(page, 'onboarding-01-dashboard');

    // 2. Criar Empresa
    console.log(`🏢 Criando Empresa: ${data.companyName}...`);
    await navigateTo(page, '/admin/companies');
    await openCreateModal(page, 'Nova Empresa');
    await fillField(page, 'input[name="name"]', data.companyName);
    await fillField(page, 'input[name="cnpj"]', data.cnpj);
    await fillField(page, 'input[name="email"]', data.email);
    await captureScreenshot(page, 'onboarding-02-company-form');
    await clickButton(page, 'Salvar');
    await expectSuccessToast(page);
    console.log('✅ Empresa criada.');

    // 3. Criar Obra (Projeto)
    console.log(`🏗️ Criando Obra: ${data.projectName}...`);
    await navigateTo(page, '/admin/projects');
    await openCreateModal(page, 'Nova');
    await fillField(page, 'input[name="name"]', data.projectName);
    await fillField(page, 'input[name="code"]', `PRJ-${Date.now()}`);

    // Selecionar a empresa recém-criada
    const companySelect = page.locator('[name="companyId"], [aria-label*="empresa" i]');
    if (await companySelect.isVisible()) {
      await companySelect.click();
      await page.locator(`[role="option"]:has-text("${data.companyName}")`).first().click();
    }

    await captureScreenshot(page, 'onboarding-03-project-form');
    await clickButton(page, 'Salvar');
    await expectSuccessToast(page);
    console.log('✅ Obra criada.');

    // 4. Criar Canteiro (Site)
    console.log(`🏕️ Criando Canteiro: ${data.siteName}...`);
    await navigateTo(page, '/admin/sites');
    await openCreateModal(page, 'Novo');
    await fillField(page, 'input[name="name"]', data.siteName);
    await fillField(page, 'input[name="code"]', `SITE-${Date.now()}`);

    // Selecionar a obra recém-criada
    const projectSelect = page.locator('[name="projectId"], [aria-label*="obra" i], [aria-label*="projeto" i]');
    if (await projectSelect.isVisible()) {
      await projectSelect.click();
      await page.locator(`[role="option"]:has-text("${data.projectName}")`).first().click();
    }

    await captureScreenshot(page, 'onboarding-04-site-form');
    await clickButton(page, 'Salvar');
    await expectSuccessToast(page);
    console.log('✅ Canteiro criado.');

    // 5. Cadastrar Funcionário
    console.log(`👤 Cadastrando Funcionário: ${data.employeeName}...`);
    await navigateTo(page, '/admin/users');
    await openCreateModal(page, 'Novo');
    await fillField(page, 'input[name="name"]', data.employeeName);
    await fillField(page, 'input[name="email"]', `user_${Date.now()}@gestaovirtual.com`);
    await fillField(page, 'input[name="cpf"]', data.cpf);

    // Atribuir Roles/Empresa (opcional conforme UI)
    const empCompanySelect = page.locator('[name="companyId"], [aria-label*="empresa" i]');
    if (await empCompanySelect.isVisible()) {
      await empCompanySelect.click();
      await page.locator(`[role="option"]:has-text("${data.companyName}")`).first().click();
    }

    await captureScreenshot(page, 'onboarding-05-employee-form');
    await clickButton(page, 'Salvar');
    await expectSuccessToast(page);
    console.log('✅ Funcionário cadastrado.');

    console.log('✨ Fluxo de Onboarding concluído com sucesso!');
    await captureScreenshot(page, 'onboarding-06-final');
  });
});
