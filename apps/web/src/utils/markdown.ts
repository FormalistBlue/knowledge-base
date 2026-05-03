import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  async: false,
  breaks: true,
  gfm: true,
});

export const renderMarkdown = (markdown: string) => {
  const rawHtml = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(rawHtml, {
    USE_PROFILES: { html: true },
  });
};
