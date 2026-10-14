# spec-loop integration guide: Gemini CLI, Claude Code, Codex

This guide says how to package spec-loop (a stdio MCP server plus Agent Skills) and how to wire it into three agents: Gemini CLI first, then Claude Code and Codex. Every claim names its source and the date it was read (14 October 2026). Section 8 lists what could not be verified.

Current state of the repository: ten tools (`learn`, `features`, `status`, `create`, `validate`, `render`, `diff`, `patch`, `phase`, `verify`), each with an `outputSchema`, the read-only ones annotated `readOnlyHint: true`; skills `framing` and `verify`; workspace root resolved as tool argument `root`, then `SPEC_LOOP_ROOT`, then `CLAUDE_PROJECT_DIR`, then the server's working directory (a value still holding an unexpanded `${…}` is skipped).

## 0. Two facts that change the plan

1. **The npm name `spec-loop` is taken.** `npm view spec-loop` returns version 1.0.1, "The Spec-Loop Method: Spec-driven planning + autonomous iteration loops", maintainer `greenteasamurai`, with its own `spec-loop` bin (modified 2026-02-05). `npx spec-loop` would run that package. Publish under a scope; this guide writes `@OWNER/spec-loop` and keeps the bin name `spec-loop`.
2. **Gemini CLI is being replaced by Antigravity CLI (`agy`).** Every geminicli.com page read today carries a banner saying Gemini CLI was replaced by Antigravity CLI on 18 June 2026 for unpaid-tier and Google One users. Google's migration page (https://www.antigravity.google/docs/cli/gcli-migration, undated) says `agy plugin import gemini` converts extensions, skills and MCP servers, that commands become skills, that the workspace MCP file becomes `.agents/mcp_config.json` and workspace skills belong in `.agents/skills/`. The Gemini extension is still worth shipping (paid and enterprise users keep Gemini CLI, and `agy` imports it), but the repository layout below is chosen so that Antigravity finds the skills without a conversion.

## 1. Gemini CLI

Sources: https://geminicli.com/docs/tools/mcp-server/, https://geminicli.com/docs/extensions/reference/ (updated 2026-05-14), https://geminicli.com/docs/extensions/releasing/ (2026-05-08), https://geminicli.com/docs/cli/skills/ (2026-04-30), https://geminicli.com/docs/cli/custom-commands/ (2026-04-30), https://geminicli.com/docs/cli/trusted-folders/ (2026-04-23), source file https://github.com/google-gemini/gemini-cli/blob/main/packages/core/src/tools/mcp-tool.ts.

**MCP in settings.** Servers go in the `mcpServers` block of `~/.gemini/settings.json` (user) or `.gemini/settings.json` (project). Stdio fields: `command`, `args`, `env`, `cwd`, `timeout` (ms, default 600 000), `trust` (default `false`; `true` skips every confirmation for that server), `includeTools`, `excludeTools` (wins over include). `env` values expand `$VAR` / `${VAR}`; undefined variables become empty strings. The CLI redacts secret-looking inherited variables before spawning servers. Command line: `gemini mcp add [-s user|project] [-e KEY=value] [--trust] [--include-tools ...] <name> <command> [args...]`; the default scope is project.

**Tool names.** The model sees `mcp_{server}_{tool}`; characters outside `[A-Za-z0-9_.:-]` become `_`; names over 63 characters are cut in the middle. The docs advise against underscores in server names because the policy parser splits on the first underscore after `mcp_`. `spec-loop` is a safe server name; `mcp_spec-loop_features` is 22 characters.

**Extensions.** An extension is a directory (or GitHub repository) with `gemini-extension.json` at its root:

- `name` (lowercase, dashes, should match the directory), `version`, `description`;
- `mcpServers` (all settings options except `trust`; a same-name server in `settings.json` wins);
- `contextFileName` (defaults to `GEMINI.md` at the extension root);
- `excludeTools`, `settings` (user-prompted values exported as env variables, secrets in the keychain), `themes`, `migratedTo`;
- folders: `commands/*.toml`, `skills/<name>/SKILL.md`, `hooks/hooks.json`, `agents/` (preview), `policies/*.toml` (extension `allow` decisions are ignored);
- variables `${extensionPath}`, `${workspacePath}`, `${/}` in the manifest and in hooks.

Extensions receive only a safe environment (`HOME`, `PATH`, `TMPDIR`) plus declared settings: a `SPEC_LOOP_ROOT` exported in the user's shell does not reach the server. Commands: `gemini extensions install <github-url|path>`, `link <path>` for development, `update`; changes apply after a restart.

**Skills.** Gemini CLI reads Agent Skills natively; no extension is needed. Discovery, lowest to highest precedence: built-in, extension `skills/`, user `~/.gemini/skills/` or `~/.agents/skills/`, workspace `.gemini/skills/` or `.agents/skills/` (the `.agents` alias wins within a tier). `/skills list`, `/skills reload`, `gemini skills install <git-url> [--path]`.

**Custom commands.** TOML files in `~/.gemini/commands/` or `.gemini/commands/` (or an extension's `commands/`); `git/commit.toml` becomes `/git:commit`. With native skills, spec-loop does not need TOML commands; Antigravity turns commands into skills anyway.

**Publishing.** Either the git repository itself (`gemini extensions install https://github.com/OWNER/spec-loop`, branches or tags as channels) or GitHub Releases (archives with `gemini-extension.json` at the archive root; optional platform names such as `darwin.arm64.spec-loop.tar.gz`; update checks follow the release marked Latest). Keep the manifest `version` equal to the release tag. Gallery: no submission; a public GitHub repository with the topic `gemini-cli-extension`, the manifest at the root and a tag is crawled daily.

**Colleague on checkout.** A committed `.gemini/settings.json` with the `mcpServers` entry, plus `.agents/skills/`, is enough. If the colleague enabled `security.folderTrust.enabled` (off by default), an untrusted folder ignores workspace settings and MCP servers until they trust it.

**Tool results.** `mcp-tool.ts` builds the model input from `content` only (text blocks wrapped as untrusted) and checks `isError`; it never reads `structuredContent`. spec-loop must therefore keep the full JSON in a text block, which it does today.

## 2. Claude Code

Sources: https://code.claude.com/docs/en/mcp, https://code.claude.com/docs/en/skills, https://code.claude.com/docs/en/plugins-reference (plugin manifest), https://code.claude.com/docs/en/plugin-marketplaces, https://code.claude.com/docs/en/plugins/org. Pages carry no date; read 2026-10-14.

**MCP.** `claude mcp add [--scope local|project|user] [-e KEY=value] <name> -- <command> [args...]`. Scope `project` writes `.mcp.json` at the project root, meant to be committed. `.mcp.json` expands `${VAR}` and `${VAR:-default}` in `command`, `args`, `env`. Interactive sessions ask once before starting servers from `.mcp.json` (`claude mcp reset-project-choices` resets the answer); `-p` runs load them without asking. Claude Code sets `CLAUDE_PROJECT_DIR` to the project root in every stdio server's environment. Limits: `MCP_TIMEOUT` (startup), `MAX_MCP_OUTPUT_TOKENS` (default 25 000), text results over 50 000 characters are written to a file unless the tool sets `_meta["anthropic/maxResultSizeChars"]`; a full tool name over 128 characters is dropped. Tool names are `mcp__spec-loop__validate`; from a plugin, `mcp__plugin_spec-loop_spec-loop__validate` (41 characters).

**Skills.** `~/.claude/skills/<name>/SKILL.md`, project `.claude/skills/<name>/SKILL.md` (start directory and parents up to the repository root), nested `<subdir>/.claude/skills/`, and plugin `skills/` (invoked as `/plugin-name:skill-name`). The format follows the Agent Skills standard with extensions (`allowed-tools`, `disable-model-invocation`, `argument-hint`, `when_to_use`). Skill directories are watched live. The docs do not list `.agents/skills/`.

**Plugins.** A plugin root holds `.claude-plugin/plugin.json` (optional; only `name` required) and, at the root, `skills/`, `commands/`, `agents/`, `hooks/hooks.json`, `.mcp.json`. `mcpServers` can also be inline in `plugin.json`. `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` resolve in stdio server `command`, `args`, `env`. Plugin names must not start with `claude-` or `anthropic-`. `claude plugin validate <dir> [--strict]` is the authoritative check.

**Marketplace.** `.claude-plugin/marketplace.json` with `name`, `owner`, `plugins[]` (`name`, `source`, `description`). A source can be a relative path from the marketplace root (`"./"` for a repository that is both marketplace and plugin), `github`, `git-subdir`, `url`, `archive`, `npm`. Users run `claude plugin marketplace add OWNER/spec-loop` then `claude plugin install spec-loop@spec-loop`.

**Colleague on checkout.** Two routes, both committed:
- direct: `.mcp.json` plus `.claude/skills/`; the colleague answers the one-time `.mcp.json` prompt;
- plugin: `.claude/settings.json` with `extraKnownMarketplaces` (source `github`, repo `OWNER/spec-loop`) and `enabledPlugins: {"spec-loop@spec-loop": true}`. The marketplace registers after the workspace trust dialog. A plugin listed by relative path inside that marketplace then loads; a plugin pointing at an external source needs `claude plugin install ... --scope project`.

**Tool results.** The official page does not describe `structuredContent`. Community reports (https://claudeissues.com/issue/55677, /15412, /54450) say Claude Code forwards `structuredContent` and drops `content` text when both are present. Harmless for spec-loop as long as both carry the same JSON.

## 3. Codex

Sources: https://learn.chatgpt.com/docs/extend/mcp?surface=cli, https://learn.chatgpt.com/docs/build-skills, https://learn.chatgpt.com/docs/plugins, https://developers.openai.com/plugins/build/plugins, https://learn.chatgpt.com/docs/config-file/config-reference.md (the developers.openai.com/codex pages now redirect to learn.chatgpt.com). Undated; read 2026-10-14.

**MCP.** `~/.codex/config.toml`, or `.codex/config.toml` in a project, loaded only for trusted projects (`projects.<path>.trust_level = "trusted"`; untrusted projects skip project `.codex/` config, hooks and rules). Table `[mcp_servers.spec-loop]`: `command`, `args`, `env`, `env_vars` (variables to forward), `cwd`, `startup_timeout_sec` (default 10), `tool_timeout_sec` (default 60), `enabled`, `required`, `enabled_tools`, `disabled_tools`, `default_tools_approval_mode` (`auto`, `prompt`, `writes`, `approve`; `writes` prompts only for tools not marked read-only), `tools.<tool>.approval_mode`, `tools.<tool>.output_token_limit`. Command line: `codex mcp add spec-loop --env KEY=VALUE -- <command>`; `codex mcp list`; `/mcp` in the TUI.

**Skills.** `.agents/skills/` in every directory from the working directory up to the repository root, `$HOME/.agents/skills`, `/etc/codex/skills`, then system skills. Symlinked skill folders are supported. Required frontmatter: `name`, `description`. Optional `agents/openai.yaml` inside a skill (display metadata, `policy.allow_implicit_invocation`, `dependencies.tools` such as an MCP server). Invocation: `$skill` or `/skills`, or implicit by description. The skills list is budgeted at 2 % of the context window. `~/.codex/skills/` is not listed in the current page.

**Plugins.** Manifest `plugin.json` at the plugin root (portable form) or `.codex-plugin/plugin.json` (Codex form, kept as fallback), with `name`, `version`, `skills` (`"./skills/"`), MCP servers in `.mcp.json` (or `mcp.json`), optional `.app.json`, `hooks/`, `assets/`. Marketplaces: `$REPO_ROOT/.agents/plugins/marketplace.json`, `~/.agents/plugins/marketplace.json`, and the legacy `$REPO_ROOT/.claude-plugin/marketplace.json`. Entries: `{"name", "source": {"source": "local", "path": "./..."}, "policy": {"installation": "AVAILABLE"|"INSTALLED_BY_DEFAULT"|...}, "category"}`. Command: `codex plugin marketplace add OWNER/spec-loop[@ref]`; `/plugins` in the TUI. Per-plugin overrides: `plugins."spec-loop@spec-loop".mcp_servers.spec-loop.default_tools_approval_mode`.

**Feature flags.** The config reference lists no `skills` or `plugins` flag: skills and plugins are on. Relevant flags, all on by default: `features.apps`, `features.remote_plugin`, `features.skill_mcp_dependency_install`; `features.hooks` enables hooks. `codex features list` shows the installed version's flags.

**Tool results.** No official statement. A community survey (olaservo, huggingface.co static space, "Structured Content vs Content") classes Codex as "structuredContent first": the model receives the serialized `structuredContent` and the text is dropped. Same conclusion as for Claude Code.

## 4. Common denominator

| Concern | Gemini CLI | Antigravity | Claude Code | Codex |
|---|---|---|---|---|
| Skills in a project | `.agents/skills/` | `.agents/skills/` | `.claude/skills/` only | `.agents/skills/` |
| Skills in a package | extension `skills/` | imported | plugin `skills/` | plugin `skills/` |
| Project MCP file | `.gemini/settings.json` | `.agents/mcp_config.json` | `.mcp.json` | `.codex/config.toml` |
| Package manifest | `gemini-extension.json` | imports Gemini | `.claude-plugin/plugin.json` | `.codex-plugin/plugin.json` |
| Marketplace file | none (gallery crawl) | n/a | `.claude-plugin/marketplace.json` | `.agents/plugins/marketplace.json` (or the Claude file) |
| Project root for the server | `${workspacePath}` | not documented | `CLAUDE_PROJECT_DIR` env | cwd only (not documented) |

Conclusions:

- **One copy of each skill.** In the spec-loop repository, `skills/<name>/SKILL.md` at the root is read by all three package formats. In a consumer project, `.agents/skills/` serves Gemini, Antigravity and Codex; Claude Code needs `.claude/skills/`, provided by a committed symlink `.claude/skills -> ../.agents/skills` or a copy (Windows checkouts without symlink support get a text file instead of a link).
- **Write SKILL.md in the strict standard subset**: `name` equal to the directory, lowercase and hyphens, at most 64 characters; `description` at most 1 024 characters and saying when to use the skill; no client-specific fields in the shared copy. Skills must name tools by their bare names (`features`, `validate`), not by a client prefix, since each client prefixes differently.
- **One launch command**, written four times: `npx -y @OWNER/spec-loop@<version>`. What is duplicated per agent is only the MCP registration file and the package manifest.
- **The root is the weak point.** Each client starts the server differently; the skills should tell the agent to pass `root` (the absolute project path) on every call, and the manifests set `SPEC_LOOP_ROOT` where a variable exists.

## 5. Recommended layout

The spec-loop repository is at once the npm package, the Gemini extension, the Claude Code plugin and marketplace, and the Codex plugin and marketplace:

```text
spec-loop/
├── package.json                    # "@OWNER/spec-loop", bin {"spec-loop": "dist/mcp.js"}, files [...]
├── src/  dist/  schema/  templates/
├── skills/
│   ├── framing/SKILL.md
│   └── verify/SKILL.md
├── GEMINI.md                       # short: what spec-loop is, call `learn` first
├── gemini-extension.json
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json            # one entry, source "./"
├── .codex-plugin/plugin.json       # skills "./skills/"
├── .mcp.json                       # plugin MCP for Claude Code and Codex
├── .agents/plugins/marketplace.json
└── examples/consumer/              # files a consumer project commits
    ├── .agents/skills/  -> copies of skills/
    ├── .claude/skills   -> symlink to ../.agents/skills
    ├── .mcp.json
    ├── .gemini/settings.json
    ├── .agents/mcp_config.json
    └── .codex/config.toml
```

Key file contents (replace `OWNER` and the version):

`gemini-extension.json`
```json
{
  "name": "spec-loop",
  "version": "0.1.0",
  "description": "Maintain a JSON feature model projected into Markdown.",
  "contextFileName": "GEMINI.md",
  "mcpServers": {
    "spec-loop": {
      "command": "npx",
      "args": ["-y", "@OWNER/spec-loop@0.1.0"]
    }
  }
}
```
Do not set `cwd` to `${extensionPath}` (the reference example does): the server would look for `spec/` inside the extension.

`.mcp.json` (plugin root and consumer projects)
```json
{ "mcpServers": { "spec-loop": { "command": "npx", "args": ["-y", "@OWNER/spec-loop@0.1.0"] } } }
```

`.claude-plugin/marketplace.json`
```json
{ "name": "spec-loop", "owner": { "name": "Alexandre Boyer" },
  "plugins": [ { "name": "spec-loop", "source": "./", "description": "Feature model loop: MCP tools and skills." } ] }
```

`.agents/plugins/marketplace.json`
```json
{ "name": "spec-loop",
  "plugins": [ { "name": "spec-loop", "source": { "source": "local", "path": "./" },
                 "policy": { "installation": "AVAILABLE" }, "category": "Productivity" } ] }
```
Whether Codex accepts `"./"` (the marketplace root itself) as a plugin path is not documented; if it refuses, move the plugin files to `plugins/spec-loop/` and point both marketplaces there.

`.codex/config.toml` (consumer project)
```toml
[mcp_servers.spec-loop]
command = "npx"
args = ["-y", "@OWNER/spec-loop@0.1.0"]
startup_timeout_sec = 60
default_tools_approval_mode = "writes"
```

`.gemini/settings.json` (consumer project)
```json
{ "mcpServers": { "spec-loop": { "command": "npx", "args": ["-y", "@OWNER/spec-loop@0.1.0"],
  "includeTools": ["validate", "render", "diff", "patch", "learn", "features", "create"] } } }
```

## 6. Packaging plan

**npm package.** In `package.json`: rename to `@OWNER/spec-loop`; remove `"private": true`; add `"bin": {"spec-loop": "dist/mcp.js"}` (the file already starts with `#!/usr/bin/env node`); add `"files": ["dist", "schema", "templates", "skills"]` because `packageRoot` reads `schema/` and `templates/` next to `dist/`; keep `"engines": {"node": ">=22"}`; publish with `npm publish --access public` (scoped packages are private by default). `prepare` already builds.

**Gemini extension.** The repository root, through `gemini-extension.json`; add the GitHub topic `gemini-cli-extension`; tag each release. No build artifact is needed in git because the extension launches the npm package.

**Claude Code plugin.** The repository root, through `.claude-plugin/plugin.json` (`name`, `version`, `description`, `author`), `skills/`, `.mcp.json`; the same repository is the marketplace.

**Codex plugin.** The repository root, through `.codex-plugin/plugin.json` with `"skills": "./skills/"` and the shared `.mcp.json`; marketplace in `.agents/plugins/marketplace.json`.

**Consumer kit.** `examples/consumer/` holds the files to copy. A later `spec-loop init` command could write them; it does not exist today.

### Release checklist

- [ ] Same version in `package.json`, `gemini-extension.json`, `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, and in every `@OWNER/spec-loop@<version>` argument (manifests and `examples/consumer/`).
- [ ] `npm run typecheck`; one targeted test file for the touched area.
- [ ] `npm pack --dry-run` lists `dist/`, `schema/`, `templates/`, `skills/`.
- [ ] Every `skills/*/SKILL.md`: `name` equals the directory, description at most 1 024 characters, no client-specific field.
- [ ] `claude plugin validate . --strict` passes.
- [ ] `npm publish --access public`, then `npx -y @OWNER/spec-loop@<version>` starts and waits on stdin.
- [ ] Copy `skills/` into `examples/consumer/.agents/skills/`.
- [ ] Commit, tag `v<version>`, create the GitHub release (Gemini update checks follow the Latest release).
- [ ] Day-one checks below, on each agent, in a scratch project with one feature under `spec/`.

## 7. Day one per agent

**Gemini CLI**
1. `gemini extensions install https://github.com/OWNER/spec-loop` (or, in a consumer project, the committed `.gemini/settings.json` and `.agents/skills/`); restart.
2. `/mcp` lists `spec-loop` with ten tools; `/skills list` shows `framing` and `verify`.
3. Ask "list the spec-loop features", then run the `framing` skill on a new feature. Antigravity users: `agy plugin import gemini`, then the same checks.

**Claude Code**
1. `claude plugin marketplace add OWNER/spec-loop` then `claude plugin install spec-loop@spec-loop`; or, in a consumer project, commit `.mcp.json` and `.claude/skills/` and accept the prompt.
2. `claude mcp list` or `/mcp` shows `spec-loop` connected; `/plugin` shows the plugin and its skills.
3. `/spec-loop:framing` (plugin) or `/framing` (project skill).

**Codex**
1. `codex plugin marketplace add OWNER/spec-loop`, then install from `/plugins`; or `codex mcp add spec-loop -- npx -y @OWNER/spec-loop@0.1.0` plus `.agents/skills/` in the project; start a new session.
2. `codex mcp list` and `/mcp` show the server; `/skills` lists the two skills.
3. `$framing` on a new feature.

## 8. Pitfalls

**Working directory.** None of the three documents the working directory it gives a stdio server. Claude Code exports `CLAUDE_PROJECT_DIR`; Gemini extensions can pass `${workspacePath}`; Codex has neither in its docs. Two changes for the server, in this order of resolution: tool argument `root`, `SPEC_LOOP_ROOT`, `CLAUDE_PROJECT_DIR`, then the MCP `roots/list` request if the client supports roots, then the working directory. And the skills should pass `root` explicitly. When no `spec/` exists at the resolved root, the error should print the resolved path.

**First start through npx.** The first `npx -y` downloads the package; Codex's default 10-second startup timeout can expire, hence `startup_timeout_sec = 60`. Pin the version: an unpinned `npx` re-resolves `latest` and can change behaviour silently. The `-y` avoids an install prompt that would block on stdin. npm writes its notices to stderr, which is safe; nothing may be written to stdout except protocol messages.

**Node version.** `engines` is only a warning under npx. With Node 20 the server may fail with an unclear error. The server should check `process.versions.node` at startup and exit with a clear message on stderr.

**Windows.** Node's `spawn` does not resolve `npx.cmd` without a shell; community guides for Claude Code use `"command": "cmd", "args": ["/c", "npx", "-y", ...]` (not in the official docs). The same probably applies to Gemini CLI and Codex (not verified). Committed symlinks (`.claude/skills`) need `core.symlinks` and Developer Mode; otherwise copy. Paths in `env` should use forward slashes.

**Environment variables.** Gemini extensions and, judging by the `env_vars` field, Codex do not pass the whole shell environment. spec-loop needs no secret; set `SPEC_LOOP_ROOT` in the configuration, never rely on the shell.

**Tool names.** Short names are fine everywhere (Gemini caps at 63 characters, Claude Code at 128 for the full name). Generic names such as `diff` or `create` are disambiguated by the client prefix, but the descriptions must say "spec-loop feature" so the model does not pick them for other work.

**structuredContent and outputSchema.** Gemini reads only `content`; Claude Code and Codex reportedly read `structuredContent` first. Keep both identical, as today. Because every tool declares an `outputSchema`, the MCP spec requires `structuredContent` to conform on success; error replies (`isError: true`) should still return a valid shape or omit `structuredContent`, since some clients validate it (a reported Gemini CLI failure, https://zenn.dev/7shi/articles/20250710-output-schema, July 2025).

**Approval prompts.** Gemini: confirmation per call unless "always allow" or `trust: true` in settings (not allowed in an extension). Claude Code: one prompt for a project `.mcp.json`, then per-tool permission; a project `.claude/settings.json` can allow `mcp__spec-loop__validate` and the like. Codex: `default_tools_approval_mode = "writes"` prompts only for tools not marked read-only. spec-loop declares no annotations today: set `readOnlyHint: true` on `validate`, `diff`, `learn`, `features`, and leave `render`, `patch`, `create` as writing tools.

### Not verified

- Whether Claude Code reads `.agents/skills/` (no official mention; the guide assumes it does not) and whether it follows a symlinked `.claude/skills`.
- The working directory each client gives a stdio server, and whether Codex exposes any workspace variable.
- How Claude Code and Codex treat `structuredContent` (community reports only).
- Whether Codex accepts `"./"` as a plugin path in a marketplace, and whether a Codex plugin `.mcp.json` accepts `startup_timeout_sec`.
- Whether Gemini substitutes `${workspacePath}` inside `env`: the day-one replay with Gemini CLI 0.1.12 showed it does not (the server created a literal `${workspacePath}/spec` folder). The manifest no longer sets it, the server skips any root value still holding `${`, and the skills pass `root`.
- Antigravity CLI's global MCP path (sources disagree between `~/.gemini/config/mcp_config.json` and others) and whether it still reads `gemini-extension.json` directly.
- Windows behaviour of `npx` under Gemini CLI and Codex.
- The extent of the Gemini CLI retirement for paid and enterprise accounts (third-party sources only).
