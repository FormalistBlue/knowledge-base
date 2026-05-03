import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './markdown';

describe('renderMarkdown', () => {
  it('renders GitHub-flavored markdown to HTML', () => {
    const html = renderMarkdown('# Title\n\n- one\n- two');

    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>two</li>');
  });

  it('sanitizes unsafe HTML from markdown input', () => {
    const html = renderMarkdown('hello<script>alert(1)</script><img src=x onerror="alert(2)">');

    expect(html).toContain('hello');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('onerror');
  });

  it('removes unsafe URLs and embedded active content', () => {
    const html = renderMarkdown('[bad](javascript:alert(1))<iframe src="https://evil.example.com"></iframe><svg onload="alert(2)"></svg>');

    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<iframe');
    expect(html).not.toContain('<svg');
    expect(html).not.toContain('onload');
  });

  it('keeps authenticated blob URLs for protected markdown images', () => {
    const html = renderMarkdown('![diagram](blob:http://local/file-1)');

    expect(html).toContain('<img');
    expect(html).toContain('src="blob:http://local/file-1"');
  });
});
