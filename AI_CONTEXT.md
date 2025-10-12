# AI Context Management with Symlinks

This project implements a unified approach to managing AI context files using symbolic links, inspired by the community trend toward standardization.

## Problem

Different AI coding tools require different context file names:

- Claude Code → `CLAUDE.md`
- Gemini CLI → `GEMINI.md`
- Cursor → `.cursor/rules`
- Cline → `.clinerules/rules`
- Roo → `.roorules/rules`
- OpenAI Codex → `AGENTS.md`
- AMP → `AGENT.md`

Maintaining multiple identical files leads to sync issues and duplication.

## Solution: Symlinks

We use **`AGENTS.md` as the single source of truth** and create symbolic links for all other AI tools.

### File Structure

```
├── AGENTS.md           # 📝 Main file (edit this one)
├── CLAUDE.md           # 🔗 → AGENTS.md
├── GEMINI.md           # 🔗 → AGENTS.md
├── CURSOR.md           # 🔗 → AGENTS.md
├── CLINE.md            # 🔗 → AGENTS.md
├── COPILOT.md          # 🔗 → AGENTS.md
├── AGENT.md            # 🔗 → AGENTS.md
├── .cursor/
│   └── rules/
│       ├── AGENTS.md   # 🔗 → ../../AGENTS.md
│       └── *.mdc       # Other Cursor-specific rules
├── .clinerules/
│   └── rules           # 🔗 → ../AGENTS.md
└── .roorules/
    └── rules           # 🔗 → ../AGENTS.md
```

### Benefits

✅ **Single source of truth** - edit only `AGENTS.md`  
✅ **Zero duplication** - no need to sync multiple files  
✅ **Git-friendly** - only `AGENTS.md` is committed  
✅ **Tool compatibility** - works with all AI coding assistants  
✅ **Easy maintenance** - change once, applies everywhere

### Git Configuration

Only `AGENTS.md` is tracked in git. All symlinks are ignored via `.gitignore`:

```gitignore
# AI context file symlinks (keep only AGENTS.md)
CLAUDE.md
GEMINI.md
CURSOR.md
CLINE.md
COPILOT.md
AGENT.md
.cursor/
.clinerules/
.roorules/
```

### Setup for New Projects

```bash
# 1. Create main context file
touch AGENTS.md

# 2. Create symlinks for different tools
ln -s AGENTS.md CLAUDE.md
ln -s AGENTS.md GEMINI.md
ln -s AGENTS.md CURSOR.md
ln -s AGENTS.md CLINE.md
ln -s AGENTS.md COPILOT.md
ln -s AGENTS.md AGENT.md

# 3. Create directory-based symlinks
mkdir -p .cursor && ln -s ../AGENTS.md .cursor/rules
mkdir -p .clinerules && ln -s ../AGENTS.md .clinerules/rules
mkdir -p .roorules && ln -s ../AGENTS.md .roorules/rules

# 4. Add symlinks to .gitignore
echo "# AI context file symlinks" >> .gitignore
echo "CLAUDE.md" >> .gitignore
echo "GEMINI.md" >> .gitignore
echo "CURSOR.md" >> .gitignore
echo "CLINE.md" >> .gitignore
echo "COPILOT.md" >> .gitignore
echo "AGENT.md" >> .gitignore
echo ".clinerules/" >> .gitignore
echo ".roorules/" >> .gitignore
```

### Windows Setup

For Windows users, use these commands (requires admin privileges):

**Command Prompt (as Administrator):**

```cmd
mklink CLAUDE.md AGENTS.md
mklink GEMINI.md AGENTS.md
```

**PowerShell (as Administrator):**

```powershell
New-Item -ItemType SymbolicLink -Path "CLAUDE.md" -Target "AGENTS.md"
New-Item -ItemType SymbolicLink -Path "GEMINI.md" -Target "AGENTS.md"
```

## Usage

1. **Edit only `AGENTS.md`** - this is your main context file
2. **All AI tools automatically see changes** through their respective symlinks
3. **Commit only `AGENTS.md`** to version control
4. **Other team members** need to run the setup commands to create symlinks locally

## Verification

Check that symlinks work correctly:

```bash
# All these should show the same content
head -n 3 AGENTS.md
head -n 3 CLAUDE.md
head -n 3 CURSOR.md
```

## Related Standards

- [agents.md](https://agents.md) - Emerging standard for AI context files
- This approach supports the community trend toward unified AI context management
