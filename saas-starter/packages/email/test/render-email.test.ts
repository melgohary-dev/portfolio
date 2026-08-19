import { describe, it, expect } from 'vitest';
import { renderResetPasswordEmail } from '../src/index.js';

describe('renderResetPasswordEmail', () => {
  const resetUrl = 'https://example.com/reset?token=abc123';

  it('returns text and html', () => {
    const result = renderResetPasswordEmail({ resetUrl });
    expect(typeof result.text).toBe('string');
    expect(typeof result.html).toBe('string');
  });

  it('includes the reset URL in text', () => {
    const { text } = renderResetPasswordEmail({ resetUrl });
    expect(text).toContain(resetUrl);
  });

  it('includes the reset URL in html as href', () => {
    const { html } = renderResetPasswordEmail({ resetUrl });
    expect(html).toContain(`href="${resetUrl}"`);
  });

  it('includes the reset URL in a clickable link', () => {
    const { html } = renderResetPasswordEmail({ resetUrl });
    expect(html).toContain('<a href=');
    expect(html).toContain('Reset my password</a>');
  });

  it('includes the 30 minute expiry warning', () => {
    const { text } = renderResetPasswordEmail({ resetUrl });
    expect(text).toContain('30 minutes');
  });

  it('includes the brand name', () => {
    const { text } = renderResetPasswordEmail({ resetUrl });
    expect(text).toContain('SaaS Starter');
  });

  it('includes the safety notice', () => {
    const { text } = renderResetPasswordEmail({ resetUrl });
    expect(text).toContain('safely ignore');
  });

  it('greets by name when provided', () => {
    const { text } = renderResetPasswordEmail({ name: 'Alice', resetUrl });
    expect(text).toMatch(/^Hi Alice,/);
    const { html } = renderResetPasswordEmail({ name: 'Alice', resetUrl });
    expect(html).toContain('Hi Alice,');
  });

  it('greets without name when omitted', () => {
    const { text } = renderResetPasswordEmail({ resetUrl });
    expect(text).toMatch(/^Hi,/);
  });

  it('html contains proper div wrapper with font-family', () => {
    const { html } = renderResetPasswordEmail({ resetUrl });
    expect(html).toMatch(/^<div style="font-family:sans-serif/);
    expect(html).toContain('</div>');
  });

  it('text has the full reset instructions', () => {
    const { text } = renderResetPasswordEmail({ resetUrl });
    expect(text).toContain('You asked to reset your password');
    expect(text).toContain('Click the link below');
    expect(text).toContain('new one');
  });
});
