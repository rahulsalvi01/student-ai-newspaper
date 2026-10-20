import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('GitHub Actions Workflow: Daily Newspaper & Gmail Delivery Spec', () => {
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'daily-newspaper.yml');

  it('Workflow file exists and is readable', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);
  });

  const content = fs.readFileSync(workflowPath, 'utf-8');

  it('1. Schedule Target: configured for 07:00 Asia/Kolkata (01:30 UTC) for news creation', () => {
    // 07:00 IST = 01:30 UTC
    expect(content).toContain('cron: "30 1 * * *"');
  });

  it('1b. Schedule Target: configured for 08:00 Asia/Kolkata (02:30 UTC) for email delivery', () => {
    // 08:00 IST = 02:30 UTC
    expect(content).toContain('cron: "30 2 * * *"');
  });

  it('2. Manual Trigger: workflow_dispatch is enabled for on-demand runs and verification', () => {
    expect(content).toContain('workflow_dispatch:');
  });

  it('3. Concurrency Protection: concurrency group set with cancel-in-progress: false', () => {
    expect(content).toContain('concurrency:');
    expect(content).toContain('group: daily-newspaper-generation');
    expect(content).toContain('cancel-in-progress: false');
  });

  it('4. Secret Hygiene: references repository secrets without exposing or logging them', () => {
    expect(content).toContain('${{ secrets.NEWSPAPER_GENERATE_URL }}');
    expect(content).toContain('${{ secrets.NEWSPAPER_GENERATE_SECRET }}');
    expect(content).toContain('${{ secrets.NEWSPAPER_GMAIL_ADDRESS }}');
    expect(content).toContain('${{ secrets.NEWSPAPER_GMAIL_APP_PASSWORD }}');

    // Invariant: Never echo secrets
    expect(content).not.toContain('echo $GENERATE_SECRET');
    expect(content).not.toContain('echo "${GENERATE_SECRET}"');
    expect(content).not.toContain('echo $GMAIL_APP_PASSWORD');
    expect(content).not.toContain('echo "${GMAIL_APP_PASSWORD}"');
  });

  it('5. Gmail SMTP Configuration: uses smtp.gmail.com over SSL on port 465', () => {
    expect(content).toContain('smtplib.SMTP_SSL("smtp.gmail.com", 465');
  });

  it('6. URL Validation: strictly requires valid HTTPS editionUrl before emailing', () => {
    // Both Python code and TRD require HTTPS
    expect(content).toContain('parsed_url.scheme != "https"');
    expect(content).toContain('Generation response must include a valid HTTPS editionUrl');
  });

  it('7. Dynamic Recipient Retrieval & Privacy: queries /api/subscribers/recipients, uses Bcc, and exits 0 on empty list', () => {
    expect(content).toContain('/api/subscribers/recipients');
    expect(content).toContain('msg["Bcc"] = ", ".join(recipients)');
    expect(content).toContain('sys.exit(0)');
  });

  it('8. Failure Isolation: generation runs in separate step from email delivery so mail failure preserves saved edition', () => {
    const steps = content.split('- name:');
    expect(steps.length).toBeGreaterThanOrEqual(3);

    const triggerStep = steps.find((s) => s.includes('Trigger protected generation endpoint'));
    const emailStep = steps.find((s) => s.includes('Email the ready edition link to Gmail'));

    expect(triggerStep).toBeDefined();
    expect(emailStep).toBeDefined();

    // Trigger step finishes and persists edition before email step runs
    expect(triggerStep).toContain('curl');
    expect(emailStep).toContain('SMTP_SSL');
  });
});
