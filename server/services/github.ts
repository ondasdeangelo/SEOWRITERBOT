import { Octokit } from "@octokit/rest";
import type { Draft, Website } from "@shared/schema";

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  /**
   * Normalizes a GitHub repository string to owner/repo format
   * Handles formats like:
   * - https://github.com/owner/repo
   * - https://github.com/owner/repo.git
   * - git@github.com:owner/repo.git
   * - owner/repo
   * - owner/repo.git
   * - owner repo (converts space to slash)
   */
  private normalizeRepo(repoString: string | null | undefined): { owner: string; repo: string } | null {
    if (!repoString || typeof repoString !== 'string') {
      return null;
    }

    // Remove leading/trailing whitespace
    let normalized = repoString.trim();

    // Remove .git suffix if present
    normalized = normalized.replace(/\.git$/, '');

    // Handle full GitHub URLs
    if (normalized.includes('github.com')) {
      // Extract owner/repo from URL patterns
      const urlMatch = normalized.match(/github\.com[/:]([^/]+)\/([^/]+?)(?:\/|$|\.git)/);
      if (urlMatch) {
        return {
          owner: urlMatch[1],
          repo: urlMatch[2],
        };
      }
    }

    // Handle git@github.com:owner/repo format
    if (normalized.startsWith('git@')) {
      const sshMatch = normalized.match(/git@[^:]+:([^/]+)\/(.+)/);
      if (sshMatch) {
        return {
          owner: sshMatch[1],
          repo: sshMatch[2],
        };
      }
    }

    // Handle simple owner/repo format
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return {
        owner: parts[0],
        repo: parts[1],
      };
    }

    // Handle space-separated format (e.g., "owner repo" -> "owner/repo")
    const spaceParts = normalized.split(/\s+/).filter(Boolean);
    if (spaceParts.length === 2) {
      return {
        owner: spaceParts[0],
        repo: spaceParts[1],
      };
    }

    return null;
  }

  /**
   * Gets the authenticated user's GitHub username
   */
  private async getAuthenticatedUser(): Promise<string> {
    const { data } = await this.octokit.users.getAuthenticated();
    return data.login;
  }

  /**
   * Creates a GitHub repository if it doesn't exist
   */
  private async ensureRepositoryExists(
    owner: string,
    repo: string,
    website: Website
  ): Promise<void> {
    try {
      // Check if repository exists
      await this.octokit.repos.get({ owner, repo });
      // Repository exists, nothing to do
      return;
    } catch (error: any) {
      if (error.status !== 404) {
        // Some other error occurred
        throw error;
      }
      // Repository doesn't exist, create it
    }

    // Get authenticated user to check if we can create the repo
    const authenticatedUser = await this.getAuthenticatedUser();

    // Determine if this is for the authenticated user or an organization
    const isUserRepo = owner.toLowerCase() === authenticatedUser.toLowerCase();

    try {
      if (isUserRepo) {
        // Create repository for the authenticated user
        await this.octokit.repos.createForAuthenticatedUser({
          name: repo,
          description: `Blog repository for ${website.name}`,
          private: false, // Default to public, can be made configurable later
          auto_init: true, // Initialize with README
          default_branch: website.githubBranch || "main",
        });
      } else {
        // Try to create for organization
        await this.octokit.repos.createInOrg({
          org: owner,
          name: repo,
          description: `Blog repository for ${website.name}`,
          private: false,
          auto_init: true,
          default_branch: website.githubBranch || "main",
        });
      }

      // Wait a moment for GitHub to fully initialize the repository
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (createError: any) {
      if (createError.status === 403) {
        throw new Error(
          `Cannot create repository "${owner}/${repo}". ` +
          `Please verify:\n` +
          `1. You have permission to create repositories for "${owner}"\n` +
          `2. Your GitHub token has the "repo" scope\n` +
          `3. If creating for an organization, you have admin access`
        );
      } else if (createError.status === 422) {
        throw new Error(
          `Cannot create repository "${owner}/${repo}". ` +
          `The repository name may already exist or be invalid.`
        );
      }
      throw new Error(
        `Failed to create repository "${owner}/${repo}": ${createError.message}`
      );
    }
  }

  async createPullRequest(
    draft: Draft,
    website: Website
  ): Promise<string> {
    if (!website.githubRepo) {
      throw new Error("GitHub repository not configured for this website");
    }

    // Parse and normalize owner/repo from githubRepo
    const repoInfo = this.normalizeRepo(website.githubRepo);
    if (!repoInfo) {
      throw new Error(
        `Invalid GitHub repository format: "${website.githubRepo}". ` +
        `Expected format: owner/repo or https://github.com/owner/repo`
      );
    }

    const { owner, repo } = repoInfo;

    const branch = website.githubBranch || "main";
    const basePath = website.githubPath || "blog";
    
    // Create a new branch for this article
    const newBranchName = `article/${this.slugify(draft.title)}-${Date.now()}`;

    // Ensure the repository exists, create it if it doesn't
    await this.ensureRepositoryExists(owner, repo, website);

    try {
      // Verify the repository is accessible (should always succeed after ensureRepositoryExists)
      await this.octokit.repos.get({
        owner,
        repo,
      });
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(
          `Repository "${owner}/${repo}" not found after creation attempt. ` +
          `Please verify the repository was created successfully.`
        );
      } else if (error.status === 403) {
        throw new Error(
          `Access denied to repository "${owner}/${repo}". ` +
          `Please verify your GitHub token has the necessary permissions.`
        );
      }
      throw new Error(
        `Failed to access repository "${owner}/${repo}": ${error.message}`
      );
    }

    try {
      // Get the reference of the base branch
      // Retry logic in case repository was just created
      let refData;
      let retries = 3;
      while (retries > 0) {
        try {
          const response = await this.octokit.git.getRef({
            owner,
            repo,
            ref: `heads/${branch}`,
          });
          refData = response.data;
          break;
        } catch (error: any) {
          if (error.status === 404 && retries > 1) {
            // Branch might not be ready yet, wait and retry
            await new Promise(resolve => setTimeout(resolve, 1000));
            retries--;
            continue;
          }
          throw error;
        }
      }
      
      if (!refData) {
        throw new Error(`Failed to get branch reference after retries`);
      }

      // Create a new branch
      await this.octokit.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranchName}`,
        sha: refData.object.sha,
      });

      // Create the MDX file content with frontmatter
      const frontmatter = this.generateFrontmatter(draft);
      const mdxContent = `---\n${frontmatter}\n---\n\n${draft.content}`;

      // Create the file in the new branch
      const fileName = `${this.slugify(draft.title)}.mdx`;
      const filePath = `${basePath}/${fileName}`;

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: `Add article: ${draft.title}`,
        content: Buffer.from(mdxContent).toString("base64"),
        branch: newBranchName,
      });

      // Create pull request
      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo,
        title: `New Article: ${draft.title}`,
        head: newBranchName,
        base: branch,
        body: `## 📝 New Article Draft\n\n**Title:** ${draft.title}\n\n**Excerpt:** ${draft.excerpt}\n\n**Stats:**\n- Word Count: ${draft.wordCount}\n- Readability Score: ${draft.readabilityScore}/100\n- Keyword Density: ${draft.keywordDensity}%\n\n---\n\nGenerated by SEO Blog Generator Bot`,
      });

      return pr.html_url;
    } catch (error: any) {
      if (error.status === 404 && error.request?.url?.includes('/git/ref/heads')) {
        throw new Error(
          `Branch "${branch}" not found in repository "${owner}/${repo}". ` +
          `The repository was created with default branch "${website.githubBranch || "main"}", ` +
          `but the branch may not be ready yet. Please try again in a moment, ` +
          `or verify the branch name is correct. Common branch names are: main, master, develop`
        );
      }
      throw error;
    }
  }

  private generateFrontmatter(draft: Draft): string {
    const frontmatter = draft.frontmatter as Record<string, any> || {};
    
    const fm: Record<string, any> = {
      title: draft.title,
      description: draft.excerpt,
      date: new Date().toISOString().split('T')[0],
      ...frontmatter,
    };

    return Object.entries(fm)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}:\n${value.map(v => `  - ${v}`).join('\n')}`;
        } else if (typeof value === 'string' && value.includes('\n')) {
          return `${key}: |\n  ${value.split('\n').join('\n  ')}`;
        } else if (typeof value === 'string') {
          return `${key}: "${value}"`;
        } else {
          return `${key}: ${value}`;
        }
      })
      .join('\n');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/--+/g, '-')
      .trim();
  }
}

export function createGitHubService(token: string): GitHubService {
  return new GitHubService(token);
}
