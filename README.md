# Tajul Islam Redwan — Portfolio Website

Personal portfolio website of **Tajul Islam Redwan**, a Diploma in Mechanical Engineering student at **Sylhet Government Polytechnic Institute**, Bangladesh.

- Live site: https://tajul.jayan.workers.dev
- LinkedIn: https://www.linkedin.com/in/tajulislamredwan

## Features

- Responsive single-page portfolio (about, experience, ventures, organizations, articles, certificates and robotics posts)
- "Ask AI" chat assistant powered by Cloudflare Workers AI, with source links for online answers
- Contact form with rate limiting
- Password-protected admin panel (`/admin`) for editing site content without touching code
- Content stored in a Cloudflare Durable Object (SQLite), with `public/content.json` as the default content

## AI search and privacy

For general questions, the chat sends the query to Bing search and the Wikipedia API, then shows source links with the answer. Questions about Tajul are answered only from the portfolio profile and the published CV summary; those questions are not sent to external search providers, and missing personal facts are not guessed.

## Tech stack

- [Cloudflare Workers](https://developers.cloudflare.com/workers/) with static assets
- Durable Objects (SQLite storage) for content, messages and admin sessions
- Workers AI for the chat assistant
- Bing RSS search and the MediaWiki API for general-question references
- Plain HTML, CSS and JavaScript (no framework, no build step)

## Project structure

```
public/          Static site (index.html, styles.css, app.js, chat.js, admin panel, assets)
src/worker.js    Worker: API routes, admin auth, chat, contact form, Durable Object
src/online-search.js  Bing/Wikipedia search, source extraction and personal-query guard
src/cv-summary.json   Verified facts transcribed from the published CV PDF
android/         Android WebView app source with a Home/Admin menu
wrangler.jsonc   Cloudflare Worker configuration
```

## Run or deploy it yourself

1. Install Wrangler: `npm install -g wrangler` and log in with `wrangler login`.
2. Set the initial admin password as secrets (a base64 salt and a base64 PBKDF2-SHA256 hash, 100,000 iterations by default; see `pbkdf2()` in `src/worker.js`):
   ```
   wrangler secret put ADMIN_PASSWORD_SALT
   wrangler secret put ADMIN_PASSWORD_HASH
   ```
   For local development, put the same two values in a `.dev.vars` file (it is git-ignored).
3. Run locally with `wrangler dev`, or deploy with `wrangler deploy`.

After logging in to `/admin`, the password can be changed from the admin panel.

## Note

The admin password hash and Cloudflare account details are intentionally **not** included in this repository.

© Tajul Islam Redwan. All rights reserved.
