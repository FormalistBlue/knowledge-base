import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({
  async: false,
  breaks: true,
  gfm: true,
});

const allowedUriPattern =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|matrix|blob):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

export const renderMarkdown = (markdown: string) => {
  const rawHtml = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_URI_REGEXP: allowedUriPattern,
    USE_PROFILES: { html: true },
  });
};
