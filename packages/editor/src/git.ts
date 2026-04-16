import { execSync } from "node:child_process";
import { dirname, basename } from "node:path";

export interface GitInfo {
  branch: string;
  worktree?: string;
}

function git(args: string, cwd: string): string {
  return execSync(`git ${args}`, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }).trim();
}

function isInsideWorkTree(cwd: string): boolean {
  return git("rev-parse --is-inside-work-tree", cwd) === "true";
}

function getBranch(cwd: string): string {
  return git("rev-parse --abbrev-ref HEAD", cwd);
}

function getToplevel(cwd: string): string {
  return git("rev-parse --show-toplevel", cwd);
}

function parseMainWorktreePath(porcelain: string): string | undefined {
  const firstEntry = porcelain.split("\n\n")[0];
  const worktreeLine = firstEntry.split("\n").find((l) => l.startsWith("worktree "));
  return worktreeLine?.slice("worktree ".length);
}

function detectWorktree(cwd: string, toplevel: string): string | undefined {
  try {
    const raw = git("worktree list --porcelain", cwd);
    const mainRoot = parseMainWorktreePath(raw);
    if (mainRoot && toplevel !== mainRoot) {
      return basename(toplevel);
    }
  } catch {
    // worktree detection is optional
  }
}

export function getGitInfo(filePath?: string): GitInfo | null {
  const cwd = filePath ? dirname(filePath) : process.cwd();
  try {
    if (!isInsideWorkTree(cwd)) return null;
    const branch = getBranch(cwd);
    const toplevel = getToplevel(cwd);
    const worktree = detectWorktree(cwd, toplevel);
    return { branch, worktree };
  } catch {
    return null;
  }
}
