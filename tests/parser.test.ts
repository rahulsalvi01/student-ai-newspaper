import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import {
  parseFeedXml,
  cleanHtmlText,
  parseDateToIso,
} from '../src/lib/feeds/parser';

describe('Feed Parser Unit Tests (Using Offline Fixtures Only)', () => {
  it('parses valid RSS 2.0 XML fixture correctly', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-rss.xml');
    const xml = fs.readFileSync(fixturePath, 'utf-8');

    const result = parseFeedXml(xml, 'https://example.com/rss.xml');

    expect(result.format).toBe('rss');
    expect(result.title).toBe('Test AI Engineering Feed');
    expect(result.entries.length).toBe(2);

    const first = result.entries[0];
    expect(first.title).toBe('New Open Weights Model Released v2.0');
    expect(first.url).toBe('https://example.com/posts/model-v2-release');
    expect(first.author).toBe('AI Engineering Team');
    expect(first.categories).toContain('Open Source');
    expect(first.categories).toContain('Models');
    expect(first.publishedAt).toBe('2026-10-18T04:30:00.000Z');
    expect(first.description).toBe(
      'A new 14B parameter open-weight model with Apache 2.0 license has been announced.'
    );

    const second = result.entries[1];
    expect(second.title).toBe('Developer Assistant CLI Tool Updated');
    expect(second.url).toBe('https://example.com/posts/cli-tool-update');
    expect(second.author).toBe('Dev Tools Org');
    expect(second.publishedAt).toBe('2026-10-17T12:00:00.000Z');
  });

  it('parses valid Atom XML fixture correctly', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-atom.xml');
    const xml = fs.readFileSync(fixturePath, 'utf-8');

    const result = parseFeedXml(xml, 'https://example.org/feed.xml');

    expect(result.format).toBe('atom');
    expect(result.title).toBe('Test Research Lab Atom Feed');
    expect(result.entries.length).toBe(1);

    const entry = result.entries[0];
    expect(entry.title).toBe('Efficient Reasoning in Small Language Models');
    expect(entry.url).toBe('https://example.org/papers/efficient-reasoning');
    expect(entry.author).toBe('Dr. Jane Doe');
    expect(entry.categories).toContain('cs.AI');
    expect(entry.categories).toContain('cs.LG');
    expect(entry.publishedAt).toBe('2026-10-18T03:15:00.000Z');
    expect(entry.description).toContain('Exploring speculative decoding');
  });

  it('throws descriptive error on malformed/unsupported XML', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'malformed.xml');
    const xml = fs.readFileSync(fixturePath, 'utf-8');

    expect(() => parseFeedXml(xml, 'https://example.com/bad.xml')).toThrow(
      'Unsupported feed format'
    );
  });

  it('parses RDF RSS 1.0 XML fixture correctly', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'sample-rdf.xml');
    const xml = fs.readFileSync(fixturePath, 'utf-8');

    const result = parseFeedXml(xml, 'https://example.org/rdf');

    expect(result.format).toBe('rss');
    expect(result.title).toBe('Sample RDF RSS 1.0 Feed');
    expect(result.entries.length).toBe(1);

    const entry = result.entries[0];
    expect(entry.title).toBe('First RDF Story');
    expect(entry.url).toBe('https://example.org/news/1');
    expect(entry.publishedAt).toBe('2026-10-18T06:00:00.000Z');
    expect(entry.author).toBe('Research Author');
  });

  it('handles empty feed with 0 entries gracefully without crashing', () => {
    const fixturePath = path.join(__dirname, 'fixtures', 'empty-feed.xml');
    const xml = fs.readFileSync(fixturePath, 'utf-8');

    const result = parseFeedXml(xml, 'https://example.com/empty');

    expect(result.format).toBe('rss');
    expect(result.title).toBe('Weekend Empty Feed');
    expect(result.entries.length).toBe(0);
  });

  it('cleanHtmlText removes scripts, tags and decodes entities safely', () => {
    const raw = '<p>Hello &amp; welcome to <script>alert(1)</script> <strong>AI</strong> &#39;News&#39;!</p>';
    const cleaned = cleanHtmlText(raw);
    expect(cleaned).toBe("Hello & welcome to AI 'News'!");
  });

  it('parseDateToIso converts dates or returns null safely', () => {
    expect(parseDateToIso('Sun, 18 Oct 2026 04:30:00 GMT')).toBe('2026-10-18T04:30:00.000Z');
    expect(parseDateToIso('2026-10-18T05:00:00Z')).toBe('2026-10-18T05:00:00.000Z');
    expect(parseDateToIso('invalid-date')).toBeNull();
    expect(parseDateToIso(null)).toBeNull();
  });
});

