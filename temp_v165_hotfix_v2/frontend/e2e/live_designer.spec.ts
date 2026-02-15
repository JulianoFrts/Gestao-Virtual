import { test } from '@playwright/test';
import { login, navigateTo } from './helpers';

/**
 * ✨ OrioN Live Designer (Spec Mode)
 *
 * Este teste não é uma validação comum, mas um AMBIENTE DE DESIGN.
 * Como usar:
 * 1. Execute: npx playwright test live_designer.spec.ts --headed
 * 2. No site aberto, segure CTRL e clique com o BOTÃO DIREITO em qualquer elemento.
 * 3. Use o painel lateral premium para mudar cores, tamanhos e paddings em tempo real.
 */

test.describe('OrioN Live Designer Mode', () => {
  test('Ativar Inspetor de UI Interativo', async ({ page }) => {
    test.setTimeout(0); // Sem timeout para permitir design manual ilimitado

    await login(page);
    await navigateTo(page, '/dashboard');

    console.log('🚀 Injetando OrioN Live Designer...');

    // Injetar o Inspetor de UI
    await page.evaluate(() => {
      const win = window as any;
      if (win.__ORION_DESIGNER_ACTIVE__) return;
      win.__ORION_DESIGNER_ACTIVE__ = true;

      // --- ESTILOS DO INSPETOR ---
      const style = document.createElement('style');
      style.textContent = `
        #orion-live-designer {
          position: fixed;
          top: 0;
          right: -350px;
          width: 320px;
          height: 100vh;
          background: rgba(13, 17, 23, 0.85);
          backdrop-filter: blur(20px) saturate(180%);
          border-left: 1px solid rgba(255, 255, 255, 0.1);
          z-index: 100000;
          color: #e6edf3;
          font-family: 'Inter', system-ui, sans-serif;
          transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          box-shadow: -10px 0 30px rgba(0,0,0,0.5);
        }

        #orion-live-designer.active {
          right: 0;
        }

        .designer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          padding-bottom: 16px;
        }

        .designer-header h2 {
          font-size: 14px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #3b82f6;
          margin: 0;
        }

        .designer-tag {
          font-family: monospace;
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 10px;
        }

        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .control-group label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          letter-spacing: 1px;
        }

        .control-group input, .control-group select, .control-group textarea {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 8px 12px;
          color: white;
          font-size: 13px;
          outline: none;
        }

        .property-row {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 12px;
        }

        .highlight-element {
          outline: 2px solid #3b82f6 !important;
          outline-offset: 2px !important;
        }

        .designer-footer {
          margin-top: auto;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.3);
          text-align: center;
          letter-spacing: 2px;
        }
      `;
      document.head.appendChild(style);

      // --- ESTRUTURA HTML ---
      const designer = document.createElement('div');
      designer.id = 'orion-live-designer';
      designer.innerHTML = `
        <div class="designer-header">
          <div>
            <h2>OrioN Live Designer</h2>
            <div id="selected-tag" class="designer-tag">Nenhum elemento selecionado</div>
          </div>
          <span style="cursor:pointer" onclick="document.getElementById('orion-live-designer').classList.remove('active')">✕</span>
        </div>

        <div class="control-group">
          <label>Cores</label>
          <div class="property-row">
            <div class="control-group">
              <label style="font-size: 9px">Texto</label>
              <input type="color" id="prop-color">
            </div>
            <div class="control-group">
              <label style="font-size: 9px">Fundo</label>
              <input type="color" id="prop-bgColor">
            </div>
          </div>
        </div>

        <div class="control-group">
          <label>Tipografia</label>
          <div class="property-row">
            <div class="control-group">
              <label style="font-size: 9px">Tamanho (px)</label>
              <input type="number" id="prop-fontSize" placeholder="16">
            </div>
            <div class="control-group">
              <label style="font-size: 9px">Peso</label>
              <input type="number" id="prop-fontWeight" step="100">
            </div>
          </div>
        </div>

        <div class="control-group">
          <label>Layout & Bordas</label>
          <div class="property-row">
            <div class="control-group">
              <label style="font-size: 9px">Radius (px)</label>
              <input type="text" id="prop-borderRadius" placeholder="8px">
            </div>
            <div class="control-group">
              <label style="font-size: 9px">Sombra</label>
              <select id="prop-boxShadow">
                <option value="none">Nenhuma</option>
                <option value="0 4px 6px -1px rgb(0 0 0 / 0.1)">Suave</option>
                <option value="0 0 20px rgba(59, 130, 246, 0.5)">Glow Blue</option>
              </select>
            </div>
          </div>
        </div>

        <div class="control-group">
          <label>CSS Export</label>
          <textarea id="css-output" readonly rows="4" style="font-family: monospace; font-size: 10px;"></textarea>
        </div>

        <div class="designer-footer">ORION V3 • LIVE_SPEC</div>
      `;
      document.body.appendChild(designer);

      let selectedElement: HTMLElement | null = null;

      const rgbToHex = (rgb: string) => {
        if (!rgb || rgb === 'transparent' || rgb.startsWith('rgba(0, 0, 0, 0)')) return '#000000';
        const vals = rgb.match(/\d+/g);
        if (!vals) return '#000000';
        return "#" + vals.slice(0,3).map(x => parseInt(x).toString(16).padStart(2, '0')).join("");
      };

      const updateOutput = () => {
        if (!selectedElement) return;
        const s = selectedElement.style;
        const css = `.custom-style {\n` +
          (s.color ? `  color: ${s.color};\n` : '') +
          (s.backgroundColor ? `  background-color: ${s.backgroundColor};\n` : '') +
          (s.fontSize ? `  font-size: ${s.fontSize};\n` : '') +
          (s.fontWeight ? `  font-weight: ${s.fontWeight};\n` : '') +
          (s.borderRadius ? `  border-radius: ${s.borderRadius};\n` : '') +
          (s.boxShadow ? `  box-shadow: ${s.boxShadow};\n` : '') +
          `}`;
        (document.getElementById('css-output') as HTMLTextAreaElement).value = css;
      };

      document.addEventListener('contextmenu', (e: MouseEvent) => {
        if (e.ctrlKey) {
          e.preventDefault();
          if (selectedElement) selectedElement.classList.remove('highlight-element');
          selectedElement = e.target as HTMLElement;
          selectedElement.classList.add('highlight-element');
          designer.classList.add('active');

          const comp = window.getComputedStyle(selectedElement);
          (document.getElementById('prop-color') as HTMLInputElement).value = rgbToHex(comp.color);
          (document.getElementById('prop-bgColor') as HTMLInputElement).value = rgbToHex(comp.backgroundColor);
          (document.getElementById('prop-fontSize') as HTMLInputElement).value = parseInt(comp.fontSize).toString();
          (document.getElementById('prop-fontWeight') as HTMLInputElement).value = comp.fontWeight;
          (document.getElementById('prop-borderRadius') as HTMLInputElement).value = comp.borderRadius;
          (document.getElementById('prop-boxShadow') as HTMLSelectElement).value = comp.boxShadow === 'none' ? 'none' : 'Suave';

          updateOutput();
        }
      });

      const bind = (id: string, prop: string, unit: string = '') => {
        document.getElementById(id)?.addEventListener('input', (e) => {
          if (!selectedElement) return;
          (selectedElement.style as any)[prop] = (e.target as HTMLInputElement).value + unit;
          updateOutput();
        });
      };

      bind('prop-color', 'color');
      bind('prop-bgColor', 'backgroundColor');
      bind('prop-fontSize', 'fontSize', 'px');
      bind('prop-fontWeight', 'fontWeight');
      bind('prop-borderRadius', 'borderRadius');
      bind('prop-boxShadow', 'boxShadow');
    });

    console.log('✅ Designer Pronto. CTRL + Direita para inspecionar.');
    await page.pause();
  });
});
