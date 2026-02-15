import { test, expect } from '@playwright/test';
import { login, navigateTo, waitForModuleLoad, captureScreenshot, clickButton } from './helpers';

test.describe('Composition Builder Fix Verification', () => {



  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/admin/teams');
  });


  test('Deve permitir arrastar colaborador para o botão de Criar Nova Equipe', async ({ page }) => {
    console.log('🏗️ Verificando fluxo de drag-to-create...');

    // 1. Aguardar carregamento (TeamComposition usa waitForModuleLoad que lida com cards)
    await waitForModuleLoad(page);

    // 2. Garantir que estamos na visualização correta (selecionar site se necessário)
    const siteSelect = page.locator('button:has-text("Todos os Canteiros")').first();
    if (await siteSelect.isVisible()) {
      await siteSelect.click();
      const firstSite = page.locator('[role="option"]').first();
      if (await firstSite.isVisible()) {
        await firstSite.click();
        await waitForModuleLoad(page);
      }
    }

    // 3. Localizar o primeiro colaborador disponível (usando o dnd-kit context wrap)
    const firstEmployeeCard = page.locator('#talent-pool [style*="transition"]').first();
    await expect(firstEmployeeCard).toBeVisible({ timeout: 15000 });
        const employeeName = await firstEmployeeCard.locator('p.text-sm.font-black').textContent();
        console.log(`👤 Colaborador identificado: ${employeeName}`);

        // 4. Localizar o botão "Criar Nova Equipe"
        const createTeamButton = page.locator('button:has-text("Criar Nova Equipe")').first();
        await expect(createTeamButton).toBeVisible();

        // 5. Simular o Drag and Drop
        console.log('🔄 Executando Drag and Drop...');
        await firstEmployeeCard.hover();
        await page.mouse.down();
        await page.mouse.move(0, 0); // Pequeno movimento para iniciar dnd context

        // Mover para o botão de criação
        const box = await createTeamButton.boundingBox();
        if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
            await page.mouse.up();
        }

        // 6. Verificar se o modal abriu
        console.log('📋 Verificando se o modal de criação abriu...');
        try {
            const dialogTitle = page.locator('h2:has-text("Nova Equipe")');
            await expect(dialogTitle).toBeVisible({ timeout: 10000 });

            // 7. Verificar se o colaborador foi pré-selecionado como líder
            const supervisorSelect = page.locator('button:has-text("Líder / Supervisor")').first();
            await expect(supervisorSelect).toBeVisible();

            // O valor do select deve ser o nome do colaborador
            await expect(page.locator('button:has-text("' + employeeName + '")')).toBeVisible();

            console.log('✅ Verificação concluída com sucesso!');
            await captureScreenshot(page, 'composition-fix-success');
        } catch (error) {
            console.error('❌ Falha na verificação final:', error);
            await captureScreenshot(page, 'composition-fix-failed');
            throw error;
        }
    });
});
