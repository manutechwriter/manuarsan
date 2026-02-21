#!/usr/bin/env node
/**
 * Post new/changed blog posts to X (Twitter).
 * Usage: node scripts/post-to-x.js [file1.md file2.md ...]
 * Or set CHANGED_FILES (space-separated paths) and run with no args.
 *
 * Requires env: X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET
 * Optional: BASE_URL (default https://manutechwriter.github.io/manuarsan)
 */

const fs = require('fs');
const path = require('path');
const { TwitterApi } = require('twitter-api-v2');

const MAX_TWEET_LENGTH = 280;

function getChangedFiles() {
  const envFiles = process.env.CHANGED_FILES;
  if (envFiles) {
    return envFiles.split(/\s+/).filter(Boolean);
  }
  return process.argv.slice(2).filter((f) => f.endsWith('.md'));
}

function parseFrontMatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return { front: {}, body: content };
  const front = {};
  const frontRaw = match[1];
  let key = null;
  let valueLines = [];
  for (const line of frontRaw.split(/\r?\n/)) {
    const keyMatch = line.match(/^([a-z_]+):\s*(.*)$/);
    if (keyMatch) {
      if (key) front[key] = valueLines.join('\n').trim();
      key = keyMatch[1];
      valueLines = [keyMatch[2].replace(/^['"]|['"]$/g, '')];
    } else if (key && (line.startsWith(' ') || line.startsWith('\t'))) {
      valueLines.push(line.trim());
    } else if (key) {
      front[key] = valueLines.join('\n').trim();
      key = null;
      valueLines = [];
    }
  }
  if (key) front[key] = valueLines.join('\n').trim();
  const body = content.slice(match[0].length);
  return { front, body };
}

function getTitle(body) {
  const m = body.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : 'New post';
}

function getExcerpt(front, body) {
  if (front.excerpt && front.excerpt.length > 0) return front.excerpt;
  const withoutTitle = body.replace(/^#\s+.+$/m, '').trim();
  const firstBlock = withoutTitle.split(/\n\n+/)[0] || '';
  return firstBlock.replace(/\s+/g, ' ').replace(/[#*_`\[\]()]/g, '').trim().slice(0, 200);
}

function slugFromFilename(filename) {
  const base = path.basename(filename, '.md');
  return base.replace(/^\d+-/, '');
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

function buildPostUrl(baseUrl, datePath, slug) {
  const base = (baseUrl || 'https://manutechwriter.github.io/manuarsan').replace(/\/$/, '');
  return `${base}/blog/${datePath}/${slug}/`;
}

function buildTweet(title, excerpt, url) {
  let text = `New post: ${title}\n\n${excerpt}\n\n${url}`;
  if (text.length > MAX_TWEET_LENGTH) {
    const maxExcerpt = MAX_TWEET_LENGTH - url.length - 20; // "New post: \n\n\n\n" + title
    const short = excerpt.slice(0, maxExcerpt - 3) + '…';
    text = `New post: ${title}\n\n${short}\n\n${url}`;
  }
  if (text.length > MAX_TWEET_LENGTH) {
    text = text.slice(0, MAX_TWEET_LENGTH - 3) + '…';
  }
  return text;
}

async function main() {
  const files = getChangedFiles();
  if (files.length === 0) {
    console.log('No changed .md files to process.');
    return;
  }

  const baseUrl = process.env.BASE_URL || 'https://manutechwriter.github.io/manuarsan';
  const client = new TwitterApi({
    appKey: process.env.X_API_KEY,
    appSecret: process.env.X_API_SECRET,
    accessToken: process.env.X_ACCESS_TOKEN,
    accessSecret: process.env.X_ACCESS_TOKEN_SECRET,
  });

  const repoRoot = process.cwd();
  for (const file of files) {
    const filePath = path.isAbsolute(file) ? file : path.resolve(repoRoot, file.startsWith('docs/') ? file : path.join('docs', 'blog', 'posts', path.basename(file)));
    if (!fs.existsSync(filePath)) {
      console.warn('Skip (not found):', filePath);
      continue;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const { front, body } = parseFrontMatter(content);
    if (front.draft === true || String(front.draft).toLowerCase() === 'true') {
      console.log('Skip (draft):', path.basename(filePath));
      continue;
    }
    const title = getTitle(body);
    const excerpt = getExcerpt(front, body);
    const slug = slugFromFilename(filePath);
    const datePath = formatDate(front.date);
    if (!datePath) {
      console.warn('Skip (no valid date):', filePath);
      continue;
    }
    const url = buildPostUrl(baseUrl, datePath, slug);
    const tweet = buildTweet(title, excerpt, url);
    try {
      await client.v2.tweet(tweet);
      console.log('Posted to X:', title);
    } catch (err) {
      console.error('Failed to post:', title, err.message);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
