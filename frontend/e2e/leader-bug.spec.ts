import { test, expect } from '@playwright/test';
import { login, navigateTo, waitForModuleLoad, captureScreenshot } from './helpers';

test.describe('Team Composition Leader Persistence', () => {
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    await login(page);
    await navigateTo(page, '/admin/teams');
  });

  test('Deve manter o lider na equipe quando membro for arrastado', async ({ page }) => {
    await waitForModuleLoad(page);

    // Encontrar os cards de equipe
    const teams = page.locator('.glass-panel'); // team columns
    await expect(teams).not.toHaveCount(0);
    
    // Pegar o nome da primeira equipe e seu líder
    const firstTeam = teams.nth(0);
    const teamName = await firstTeam.locator('h3').textContent();
    const leaderContainer = firstTeam.locator('.rounded-2xl').first();
    const leaderName = await leaderContainer.locator('p.text-white').first().textContent();

    console.log(`[TEST] Equipe original: ${teamName}`);
    console.log(`[TEST] Lider original: ${leaderName}`);

    // Pegar um membro dessa equipe
    const membersList = firstTeam.locator('.group').filter({ hasNot: page.locator('.fill-amber-500') });
    const count = await membersList.count();
    
    if (count > 0) {
      const firstMember = membersList.first();
      const memberName = await firstMember.locator('p.text-white').textContent();
      console.log(`[TEST] Membro original a ser arrastado: ${memberName}`);

      // Arrastar para "Disponíveis" (Talent Pool)
      const targetList = page.locator('#talent-pool');
      
      console.log('[TEST] Arrstando membro...');
      await firstMember.hover();
      await page.mouse.down();
      
      const targetBox = await targetList.boundingBox();
      if (targetBox) {
        // Move to target list
        await page.mouse.move(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2, { steps: 20 });
        await page.mouse.up();
      }

      await page.waitForTimeout(2000);

      // Verificar novamente a primeira equipe se o líder ainda está lá
      const endLeaderName = await leaderContainer.locator('p.text-white').first().textContent();
      console.log(`[TEST] Lider apos arrastar membro: ${endLeaderName}`);
      
      if (leaderName && (!endLeaderName || endLeaderName !== leaderName)) {
        throw new Error('BUUUUG: O líder desapareceu depois de arrastar um membro!');
      } else {
        console.log('[TEST] Passou! O líder não sumiu ao arrastar um membro.');
      }
    } else {
      console.log('[TEST] Não há membros normais para arrastar.');
    }
  });
});
