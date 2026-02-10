import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettingsPanel } from '../../src/components/SettingsPanel/SettingsPanel';
import styles from '../../src/components/SettingsPanel/SettingsPanel.module.css';
import type { UserSettings } from '../../src/hooks/useSettings';

const baseSettings: UserSettings = {
  hideSeenBooks: true,
  hideCompletedBooks: true,
  popularityWeight: 0,
};

const renderOpenPanel = () =>
  render(
    <SettingsPanel
      isOpen={true}
      onClose={vi.fn()}
      settings={baseSettings}
      onSettingsChange={vi.fn()}
    />
  );

describe('Support links in SettingsPanel', () => {
  it('US-001-1-AC1-T1 shows SUPPORT THE GUILD below LOOKING FOR MORE?', () => {
    const { container } = renderOpenPanel();
    const text = container.textContent ?? '';
    const lookingIndex = text.indexOf('LOOKING FOR MORE?');
    const supportIndex = text.indexOf('SUPPORT THE GUILD');

    expect(lookingIndex).toBeGreaterThan(-1);
    expect(supportIndex).toBeGreaterThan(-1);
    expect(lookingIndex).toBeLessThan(supportIndex);
  });

  it('US-001-1-AC2-T1 uses sectionHeader and infoText styling for support section', () => {
    renderOpenPanel();

    const supportHeader = screen.getByText('SUPPORT THE GUILD');
    expect(supportHeader).toHaveClass(styles.sectionHeader);

    const infoText = screen.getByText(/tavern lights on/i).closest('div');
    if (!infoText) {
      throw new Error('Support info text container not found');
    }
    expect(infoText).toHaveClass(styles.infoText);
  });

  it('US-001-1-AC3-T1 is not visible when settings panel is closed', () => {
    render(
      <SettingsPanel
        isOpen={false}
        onClose={vi.fn()}
        settings={baseSettings}
        onSettingsChange={vi.fn()}
      />
    );

    expect(screen.queryByText('SUPPORT THE GUILD')).not.toBeInTheDocument();
  });

  it('US-001-2-AC1-T1 uses the Patreon URL', () => {
    renderOpenPanel();

    const patreonLink = screen.getByRole('link', { name: 'Buy me a potion on Patreon' });
    expect(patreonLink).toHaveAttribute('href', 'https://patreon.com/jcjolley');
  });

  it('US-001-2-AC2-T1 opens the Patreon link in a new tab with safe rel', () => {
    renderOpenPanel();

    const patreonLink = screen.getByRole('link', { name: 'Buy me a potion on Patreon' });
    expect(patreonLink).toHaveAttribute('target', '_blank');
    expect(patreonLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('US-001-2-AC3-T1 uses RPG-themed Patreon copy', () => {
    renderOpenPanel();

    expect(screen.getByRole('link', { name: 'Buy me a potion on Patreon' })).toBeInTheDocument();
  });

  it('US-001-2-AC4-T1 styles the Patreon link with externalLink', () => {
    renderOpenPanel();

    const patreonLink = screen.getByRole('link', { name: 'Buy me a potion on Patreon' });
    expect(patreonLink).toHaveClass(styles.externalLink);
  });

  it('US-001-3-AC1-T1 uses the Audible trial URL', () => {
    renderOpenPanel();

    const audibleLink = screen.getByRole('link', { name: 'Try Audible free' });
    expect(audibleLink).toHaveAttribute(
      'href',
      'https://www.amazon.com/hz/audible/mlp/membership/premiumplus?tag=jolleyboy-20'
    );
  });

  it('US-001-3-AC2-T1 opens the Audible link in a new tab with safe rel', () => {
    renderOpenPanel();

    const audibleLink = screen.getByRole('link', { name: 'Try Audible free' });
    expect(audibleLink).toHaveAttribute('target', '_blank');
    expect(audibleLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('US-001-3-AC3-T1 uses approachable Audible copy', () => {
    renderOpenPanel();

    expect(screen.getByRole('link', { name: 'Try Audible free' })).toBeInTheDocument();
  });

  it('US-001-3-AC4-T1 notes the affiliate link in the disclaimer', () => {
    renderOpenPanel();

    const disclaimer = screen.getByText(/affiliate link/i);
    expect(disclaimer).toHaveClass(styles.disclaimer);
  });
});
