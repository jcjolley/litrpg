# /ship - Commit and merge to main

Ship all changes from the current branch to main with a detailed commit message.

## Usage

```
/ship [--no-push] [--dry-run]
```

## Workflow

Execute these steps in order, aborting on any failure:

### 1. Validate State

```bash
# Check we're not on main
git branch --show-current
# Should NOT be "main" - if it is, just commit and push directly

# Check for uncommitted changes on main (if in worktree)
# Abort if main has uncommitted changes
```

### 2. Fetch Latest

```bash
git fetch origin main
```

### 3. Check for Conflicts

```bash
# Dry-run merge to detect conflicts
git merge-tree $(git merge-base HEAD origin/main) HEAD origin/main
```

If conflicts detected, abort and list conflicting files.

### 4. Analyze Changes

Run in parallel:
```bash
git status
git diff --stat
git diff HEAD~1..HEAD  # if commits exist
git log main..HEAD --oneline  # commits not on main
```

Read key changed files to understand the changes.

### 5. Generate Commit Message

Create a commit message following this format:

```
<type>: <50 char summary>

- <bullet point for each logical change>
- <group related file changes together>

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`

### 6. Stage and Commit

```bash
# Stage all changes (except sensitive files)
git add -A

# Check for sensitive files and warn
git diff --cached --name-only | grep -E '\.(env|pem|key)$|credentials|secret'

# Commit with HEREDOC for message formatting
git commit -m "$(cat <<'EOF'
<generated message>
EOF
)"
```

### 7. Merge to Main

For worktrees:
```bash
# Get the main repo path
MAIN_REPO=$(git worktree list | grep -v $(pwd) | head -1 | awk '{print $1}')

# Merge from main repo
cd "$MAIN_REPO"
git checkout main
git merge <branch-name>
```

For regular branches:
```bash
git checkout main
git merge <branch-name>
```

### 8. Push

```bash
git push origin main
```

If `--no-push` flag is set, skip this step.

### 9. Report

Output:
```
Shipped <commit-hash> to main.
```

## Flags

- `--no-push`: Commit and merge but don't push to origin
- `--dry-run`: Show what would be committed without doing it

## Safety Rules

- **Never force push** - abort if push requires force
- **Never amend pushed commits** - always create new commits
- **Warn on sensitive files** - `.env`, credentials, keys, secrets
- **Abort on conflicts** - don't attempt automatic resolution
- **Preserve working directory** - return to original branch on failure

## Edge Cases

| Scenario | Action |
|----------|--------|
| No changes | Exit with "Nothing to ship" |
| Already on main | Just commit and push directly |
| Merge conflicts | Abort, list conflicting files |
| No remote | Skip push, warn user |
| Detached HEAD | Abort with error |
