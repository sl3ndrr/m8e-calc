import { test,expect } from '@playwright/test';
import { qaSetup, ready, qaModes } from './qa-setup';
for(const [width,height] of [[1920,1080],[2560,1440],[3840,2160]]) for(const theme of ['light','dark']) for(const mode of qaModes) {
  test(`${mode} ${width} ${theme}`,async({page})=>{
    await qaSetup(page,theme);await page.setViewportSize({width:width??1920,height:height??1080});
    await page.goto(`/m8e-calc/#/${mode}`);await ready(page,mode);
    if(mode==='simple'){await page.keyboard.type('12+3=');}
    if(mode==='scientific'){const e=page.getByRole('textbox',{name:'Ausdruck',exact:true});await e.fill('sin(30)');await e.press('Enter');await expect(page.locator('.scientific-result-text')).toHaveText('0,5');}
    if(mode==='convert'){const e=page.getByRole('textbox',{name:'Schnelleingabe',exact:true});await e.fill('5 km in mi');await e.press('Enter');await expect(page.locator('.convert-result')).toContainText('3,106856');}
    if(mode==='graph'){await page.getByRole('button',{name:'Hinzufügen',exact:true}).click();await page.locator('.graph-editor [role="textbox"]').fill('sin(x)');await expect(page.locator('canvas.graph-canvas')).toHaveAttribute('data-curve-count','1');}
    await page.evaluate(()=>document.fonts.ready);
    await expect(page).toHaveScreenshot(`${mode}-${width}-${theme}.png`,{animations:'disabled',caret:'hide',maxDiffPixelRatio:0.001});
  });
}
