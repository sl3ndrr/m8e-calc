import { expect, type Locator } from '@playwright/test';
/** Use CodeMirror's own select-all command before native text insertion. DOM-only
 * contenteditable fill can race its selection reconciliation and append text. */
export async function replaceGraphExpression(
  editor: Locator,
  value: string,
): Promise<void> {
  await editor.focus();
  await editor.press('ControlOrMeta+A');
  await editor.page().keyboard.insertText(value);
  await expect(editor).toHaveText(value);
}
