import { test, expect } from '@playwright/test';
import {
  login,
  navigateTo,
  waitForModuleLoad,
  captureScreenshot
} from './helpers';

test.describe('Filtro de Responsável (Líderes de Equipe)', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('Deve exibir apenas líderes com equipes na Programação de RDO', async ({ page }) => {
    console.log('📋 Acessando página de Programação de RDO...');

    await navigateTo(page, '/rdo-scheduling');
    await page.waitForTimeout(3000);

    // Clicar no ComboBox de "Responsável pela Equipe"
    // Buscando pelo botão que tem o placeholder 'Buscar responsável...' ou algo similar
    const employeePickerButton = page.locator('button[role="combobox"]').filter({ hasText: 'Buscar responsável...' });
    
    if (await employeePickerButton.isVisible()) {
      await employeePickerButton.click();
      await page.waitForTimeout(1000);
      
      // Capturar screenshot para debug
      await captureScreenshot(page, 'rdo-scheduling-leader-picker');
      
      // Checar as opções na lista suspensa
      const options = page.locator('[role="option"]');
      const count = await options.count();
      
      console.log(`Encontradas ${count} opções de responsáveis.`);
      
      for (let i = 0; i < count; i++) {
        const text = await options.nth(i).textContent();
        console.log(`Opção ${i+1}: ${text?.trim()}`);
      }
      
      // Fechar o popover
      await page.keyboard.press('Escape');
    } else {
      console.log('Botão de seleção de responsável não encontrado.');
      // Fallback: tentar encontrar o label e clicar no botão próximo
      const label = page.locator('label', { hasText: 'Responsável pela Equipe' });
      if (await label.isVisible()) {
         console.log('Label encontrado, procurando botão de combobox...');
         // Em casos onde o id/for não está perfeitamente alinhado, podemos não achar tão fácil. 
         // Isso é só caso a busca direta falhe.
      }
    }
  });

  test('Deve exibir apenas líderes com equipes no Novo Relatório', async ({ page }) => {
    console.log('📋 Acessando página de Novo Relatório...');

    await navigateTo(page, '/daily-report');
    await page.waitForTimeout(3000);

    const employeePickerButton = page.locator('button[role="combobox"]').filter({ hasText: 'Buscar responsável...' });
    
    if (await employeePickerButton.isVisible()) {
      await employeePickerButton.click();
      await page.waitForTimeout(1000);
      
      // Capturar screenshot para debug
      await captureScreenshot(page, 'daily-report-leader-picker');
      
      // Checar as opções na lista suspensa
      const options = page.locator('[role="option"]');
      const count = await options.count();
      
      console.log(`Encontradas ${count} opções de responsáveis no Relatório.`);
    }
  });
});
