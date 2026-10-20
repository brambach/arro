// Runs before the static files in public/ (assets.run_worker_first).
// It sends old and alternate hostnames to https://saunafam.com, serves the
// join page for /join/<code>, and hands everything else to the files.

const APEX = 'saunafam.com';
const OLD_HOSTS = new Set(['arrofamily.com', 'www.arrofamily.com']);

// Invite codes are 8 characters today (src/state/invite.ts); allow 4 to 12
// so an older or newer length still lands on the page.
const JOIN = /^\/join\/([A-Za-z0-9]{4,12})(\/?)$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname.toLowerCase();

    // Arro's domain. Build 8 invite links, the App Store privacy URL and
    // old bookmarks keep working: same path and query, on saunafam.com.
    if (OLD_HOSTS.has(host)) {
      return redirect(`https://${APEX}${url.pathname}${url.search}`);
    }

    // www and plain http go to the https apex, path and query kept.
    if (host === `www.${APEX}` || (host === APEX && url.protocol === 'http:')) {
      return redirect(`https://${APEX}${url.pathname}${url.search}`);
    }

    // The old /join/?code=ABC23456 form becomes /join/ABC23456.
    if (url.pathname === '/join/' || url.pathname === '/join') {
      const code = url.searchParams.get('code') || '';
      if (/^[A-Za-z0-9]{4,12}$/.test(code)) {
        return redirect(`${url.origin}/join/${code.toUpperCase()}`);
      }
    }

    // /join/<code>/ drops the slash, so there's one URL per invite.
    const join = url.pathname.match(JOIN);
    if (join && join[2]) {
      url.pathname = `/join/${join[1]}`;
      return redirect(url.toString());
    }
    if (join) {
      const code = join[1].toUpperCase();
      const page = await env.ASSETS.fetch(new URL('/join/', url));
      return withCode(page, code);
    }

    return env.ASSETS.fetch(request);
  },
};

function redirect(location) {
  return new Response(null, { status: 301, headers: { Location: location } });
}

// Writes the code into the join page's title, link preview tags and the
// big code on the page, so iMessage and friends show it without running JS.
// The code is [A-Z0-9] only (checked above), so it's safe to put in HTML.
function withCode(page, code) {
  if (typeof HTMLRewriter === 'undefined' || !page.ok) return page;
  const title = `You're invited to a family on Saunafam. Your code is ${code}`;
  const pageUrl = `https://${APEX}/join/${code}`;
  const setContent = (value) => ({ element: (el) => el.setAttribute('content', value) });
  return new HTMLRewriter()
    .on('title', { element: (el) => el.setInnerContent(`Join with code ${code} · Saunafam`) })
    .on('meta[property="og:title"]', setContent(title))
    .on('meta[name="twitter:title"]', setContent(title))
    .on('meta[property="og:url"]', setContent(pageUrl))
    .on('[data-code]', {
      element: (el) => {
        el.setInnerContent(code);
        el.removeAttribute('hidden');
      },
    })
    .on('[data-code-wrap]', { element: (el) => el.removeAttribute('hidden') })
    .on('[data-no-code]', { element: (el) => el.remove() })
    .transform(page);
}
