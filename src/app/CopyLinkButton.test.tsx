import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { CopyLinkButton } from './CopyLinkButton';
import { decodePermalink } from './permalinks';
import { setI18nLocale, t } from '../shared/i18n';
import { Snackbar } from '../ui/Snackbar';
import { snackbarQueue } from '../ui/snackbarQueue';

afterEach(() => {
  snackbarQueue.clear();
  setI18nLocale('de');
  vi.restoreAllMocks();
});
for (const locale of ['de', 'en'] as const) {
  it(`shares the current state by keyboard with localized feedback (${locale})`, async () => {
    setI18nLocale(locale);
    const user = userEvent.setup();
    const write = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    let expression = '1+2';
    render(
      <>
        <CopyLinkButton
          mode="scientific"
          data={() => ({ expression, angleMode: 'rad' })}
        />
        <Snackbar label="Feedback" closeLabel="Close" />
      </>,
    );
    const button = screen.getByRole('button', { name: t('comfort.shareLink') });
    expect(button).toHaveTextContent('share');
    await user.tab();
    expect(button).toHaveFocus();
    expression = 'sin(3)';
    await user.keyboard('{Enter}');
    expect(write).toHaveBeenCalledOnce();
    const url = new URL(write.mock.calls[0]?.[0] ?? '');
    expect(decodePermalink(url.hash)).toEqual({
      mode: 'scientific',
      data: { expression, angleMode: 'rad' },
    });
    expect(await screen.findByText(t('comfort.linkCopied'))).toBeVisible();
  });
  it(`keeps clipboard errors visible (${locale})`, async () => {
    setI18nLocale(locale);
    const user = userEvent.setup();
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(
      new Error('denied'),
    );
    render(
      <>
        <CopyLinkButton
          mode="scientific"
          data={{ expression: '2', angleMode: 'deg' }}
        />
        <Snackbar label="Feedback" closeLabel="Close" />
      </>,
    );
    await user.click(
      screen.getByRole('button', { name: t('comfort.shareLink') }),
    );
    expect(await screen.findByText(t('comfort.linkError'))).toBeVisible();
  });
}
