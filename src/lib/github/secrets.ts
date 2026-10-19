import { seal } from 'tweetsodium';
import { subscribersRepo } from '../db/repository';

export interface GitHubSyncOptions {
  token?: string;
  owner?: string;
  repo?: string;
  secretName?: string;
  fetchFn?: typeof fetch;
}

export interface GitHubSyncResult {
  success: boolean;
  synced: boolean;
  totalRecipients: number;
  secretName: string;
  message: string;
  error?: string;
}

/**
 * Encrypts a plaintext secret value using Libsodium sealed-box encryption
 * with the repository's public key (base64-encoded).
 */
export function encryptSecret(secretValue: string, publicKeyBase64: string): string {
  const messageBytes = Buffer.from(secretValue, 'utf-8');
  const keyBytes = Buffer.from(publicKeyBase64, 'base64');
  const encryptedBytes = seal(messageBytes, keyBytes);
  return Buffer.from(encryptedBytes).toString('base64');
}

/**
 * Concurrency mutex to ensure only one synchronization job runs at a time.
 * If multiple subscriptions arrive concurrently, they are processed safely in sequence.
 */
let ongoingSyncPromise: Promise<GitHubSyncResult> | null = null;

/**
 * Synchronizes all active subscribers from the persistent database to the GitHub Actions
 * recipient repository secret.
 */
export async function syncSubscribersToGitHubSecret(
  options: GitHubSyncOptions = {}
): Promise<GitHubSyncResult> {
  // If a sync is currently in progress, wait for it before starting the next one
  if (ongoingSyncPromise) {
    try {
      await ongoingSyncPromise;
    } catch {
      // Continue to next run regardless of prior failure
    }
  }

  const currentPromise = performSync(options);
  ongoingSyncPromise = currentPromise;

  try {
    return await currentPromise;
  } finally {
    if (ongoingSyncPromise === currentPromise) {
      ongoingSyncPromise = null;
    }
  }
}

async function performSync(options: GitHubSyncOptions = {}): Promise<GitHubSyncResult> {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const owner = options.owner ?? process.env.GITHUB_OWNER;
  const repo = options.repo ?? process.env.GITHUB_REPO;
  const secretName =
    options.secretName ??
    process.env.GITHUB_RECIPIENT_SECRET_NAME ??
    'NEWSPAPER_RECIPIENT_EMAIL';
  const fetcher = options.fetchFn ?? fetch;

  // 1. Gather all active subscribers from database
  const dbSubscribers = await subscribersRepo.getActiveSubscribers();

  // 2. Merge with any existing configured recipients from env so manual entries are preserved
  const existingConfig = process.env.NEWSPAPER_RECIPIENT_EMAIL || process.env.EXISTING_RECIPIENTS || '';
  const initialRecipients = existingConfig
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

  // 3. Deduplicate and normalize
  const recipientSet = new Set<string>();
  for (const email of initialRecipients) {
    recipientSet.add(email.toLowerCase());
  }
  for (const email of dbSubscribers) {
    recipientSet.add(email.toLowerCase());
  }

  const finalRecipients = Array.from(recipientSet);

  if (finalRecipients.length === 0) {
    return {
      success: true,
      synced: false,
      totalRecipients: 0,
      secretName,
      message: 'No active recipients found to sync.',
    };
  }

  // Format as comma-separated string expected by .github/workflows/daily-newspaper.yml
  const secretValue = finalRecipients.join(',');

  // If GitHub token or repository details are missing, return clean diagnostic without throwing
  if (!token || !owner || !repo) {
    const missing = [];
    if (!token) missing.push('GITHUB_TOKEN');
    if (!owner) missing.push('GITHUB_OWNER');
    if (!repo) missing.push('GITHUB_REPO');

    console.warn(
      `[GitHub Sync] Skipped GitHub secret sync. Missing environment variables: ${missing.join(', ')}. ` +
        `Subscribers remain safely persisted in database (${finalRecipients.length} recipients active).`
    );

    return {
      success: true,
      synced: false,
      totalRecipients: finalRecipients.length,
      secretName,
      message: `Preserved ${finalRecipients.length} subscriber(s) in database. GitHub secret sync skipped (missing ${missing.join(', ')}).`,
    };
  }

  // 4. Retrieve repository's Actions public key
  const publicKeyUrl = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/public-key`;
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Student-AI-Newspaper-Subscriber-Sync',
  };

  let publicKeyData: { key_id: string; key: string };
  try {
    const keyResp = await fetcher(publicKeyUrl, {
      method: 'GET',
      headers,
    });

    if (!keyResp.ok) {
      const errText = await keyResp.text();
      throw new Error(`Failed to get public key (HTTP ${keyResp.status}): ${errText}`);
    }

    publicKeyData = (await keyResp.json()) as { key_id: string; key: string };
    if (!publicKeyData.key_id || !publicKeyData.key) {
      throw new Error('Invalid public key payload returned from GitHub API');
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[GitHub Sync] Error fetching public key:', errMsg);
    return {
      success: false,
      synced: false,
      totalRecipients: finalRecipients.length,
      secretName,
      message: 'Failed to retrieve GitHub Actions public key.',
      error: errMsg,
    };
  }

  // 5. Encrypt using Libsodium sealed box
  let encryptedValue: string;
  try {
    encryptedValue = encryptSecret(secretValue, publicKeyData.key);
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[GitHub Sync] Encryption failed:', errMsg);
    return {
      success: false,
      synced: false,
      totalRecipients: finalRecipients.length,
      secretName,
      message: 'Failed to encrypt secret payload.',
      error: errMsg,
    };
  }

  // 6. Update repository secret via GitHub Actions REST API
  const updateSecretUrl = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${secretName}`;
  try {
    const updateResp = await fetcher(updateSecretUrl, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        encrypted_value: encryptedValue,
        key_id: publicKeyData.key_id,
      }),
    });

    if (!updateResp.ok) {
      const errText = await updateResp.text();
      throw new Error(`Failed to update repository secret (HTTP ${updateResp.status}): ${errText}`);
    }

    console.log(
      `[GitHub Sync] Successfully updated GitHub Actions secret "${secretName}" with ${finalRecipients.length} recipient(s).`
    );

    return {
      success: true,
      synced: true,
      totalRecipients: finalRecipients.length,
      secretName,
      message: `Successfully updated GitHub Actions secret with ${finalRecipients.length} recipient(s).`,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[GitHub Sync] Error updating secret:', errMsg);
    return {
      success: false,
      synced: false,
      totalRecipients: finalRecipients.length,
      secretName,
      message: 'Failed to update GitHub Actions secret.',
      error: errMsg,
    };
  }
}
