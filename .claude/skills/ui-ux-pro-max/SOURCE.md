# Source

This skill is vendored from the upstream project:

- Repository: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
- Author: NextLevelBuilder
- License: MIT (see `LICENSE` in this directory)
- Vendored version: 2.13.0 (commit `bc826e2267a36d98a2dcf5231e16c30ff546770f`)

Files under `data/`, `references/`, `scripts/`, and `SKILL.md` are copied
verbatim from the upstream repo's `.claude/skills/ui-ux-pro-max/` directory
(the `scripts/tests/` developer test suite was omitted as it is not needed
at runtime).

To pick up upstream updates, re-run the vendoring or use the upstream CLI:

```bash
npx ui-ux-pro-max-cli init --ai claude
```

See the upstream README for the full feature set and Claude Marketplace
install option (`/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill`).
