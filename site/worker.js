// Runs before the static files in public/ (assets.run_worker_first).
// It does two things and hands everything else to the files.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // www.arrofamily.com is a second custom domain on this Worker, so it has
    // DNS and a certificate. Send it to the apex, keeping the path. Plain
    // http goes to https too (the zone's "Always Use HTTPS" isn't on).
    const live = url.hostname === 'arrofamily.com' || url.hostname === 'www.arrofamily.com';
    if (live && (url.hostname === 'www.arrofamily.com' || url.protocol === 'http:')) {
      url.hostname = 'arrofamily.com';
      url.protocol = 'https:';
      return Response.redirect(url.toString(), 301);
    }

    // Phase 5 invite links look like /join/ABC234 (inviteLink() in
    // src/state/invite.ts). Serve the join page; site.js reads the code.
    // The page links its files as ../styles.css, so drop a trailing slash
    // first or they'd resolve under /join/<code>/.
    const join = url.pathname.match(/^\/join\/([A-Za-z0-9]{4,12})(\/?)$/);
    if (join && join[2]) {
      url.pathname = `/join/${join[1]}`;
      return Response.redirect(url.toString(), 301);
    }
    if (join) {
      return env.ASSETS.fetch(new URL('/join/', url));
    }

    return env.ASSETS.fetch(request);
  },
};
