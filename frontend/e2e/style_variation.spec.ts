import { test, expect } from '@playwright/test';
import { login, navigateTo, captureScreenshot } from './helpers';

/**
 * Teste de Manipulação Dinâmica de Estilos
 *
 * Este spec demonstra como o Playwright pode ser usado para alterar
 * visualmente a página durante a execução (mudar cores, tamanhos, etc).
 */

test.describe('Manipulação Dinâmica de UI', () => {

  test('Deve alterar estilos visualmente via script', async ({ page }) => {
    await login(page);
    await navigateTo(page, '/dashboard');

    console.log('🎨 Alterando estilos em tempo real...');

    // 1. Mudar cor e tamanho do título do Dashboard
    await page.locator('h1').evaluate(el => {
      (el as HTMLElement).style.color = '#ff0055';
      (el as HTMLElement).style.fontSize = '3rem';
      (el as HTMLElement).style.textTransform = 'uppercase';
      (el as HTMLElement).style.textShadow = '0 0 20px rgba(255, 0, 85, 0.5)';
    });

    // 2. Mudar padding e borda de um Card
    await page.locator('.glass-card').first().evaluate(el => {
      (el as HTMLElement).style.padding = '50px';
      (el as HTMLElement).style.border = '2px solid #00ff88';
      (el as HTMLElement).style.backgroundColor = 'rgba(0, 255, 136, 0.1)';
    });

    // 3. Remover um elemento temporariamente da tela
    await page.locator('aside').evaluate(el => {
      (el as HTMLElement).style.opacity = '0.3';
      (el as HTMLElement).style.filter = 'grayscale(100%)';
    });

    await page.waitForTimeout(2000);
    await captureScreenshot(page, 'manipulacao-estilos-demo');

    console.log('✅ Estilos alterados para demonstração.');
  });
});
