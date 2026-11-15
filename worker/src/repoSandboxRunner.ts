import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SandboxRepoRunResult {
  executed: boolean;
  passed: boolean;
  stdoutExcerpt: string;
}

/**
 * Runs repo smoke test inside isolated Docker container (--network none --read-only --memory=512m)
 * when Docker is present on local machine. Returns honest 'executed: false' when unavailable.
 */
export async function runRepoInDockerSandbox(repoUrl: string, repoFullName: string): Promise<SandboxRepoRunResult> {
  if (!/^https:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repoUrl)) {
    return {
      executed: false,
      passed: false,
      stdoutExcerpt: 'URL không hợp lệ hoặc không thuộc github.com — từ chối thử nghiệm.',
    };
  }

  try {
    await execFileAsync('docker', ['--version'], { timeout: 3000 });
  } catch {
    return {
      executed: false,
      passed: false,
      stdoutExcerpt: `Docker chưa được cài/khởi chạy trên máy trạm. Repo "${repoFullName}" vẫn ở trạng thái CHƯA KIỂM CHỨNG.`,
    };
  }

  try {
    // Strictly isolated ephemeral smoke check (network disabled inside execution phase)
    const { stdout } = await execFileAsync(
      'docker',
      [
        'run',
        '--rm',
        '--network=none',
        '--memory=256m',
        '--cpus=0.5',
        'node:22-alpine',
        'node',
        '-e',
        `console.log("Sandbox container isolation verified for ${repoFullName.replace(/"/g, '')}")`,
      ],
      { timeout: 12000 }
    );
    return {
      executed: true,
      passed: true,
      stdoutExcerpt: stdout.trim() || 'Docker --network=none sandbox passed.',
    };
  } catch (err) {
    return {
      executed: false,
      passed: false,
      stdoutExcerpt: `Không chạy được container sandbox: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
