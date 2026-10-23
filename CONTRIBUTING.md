# Contributing to Imbaraga

## Branches

| Branch | Purpose | Who merges |
|---|---|---|
| `main` | Production. Always deployable. | Release pull requests from `dev` only |
| `dev` | Integration. Finished work is combined and tested here. | Pull requests from feature branches |
| `feature/<name>` | New features | Pull request into `dev` |
| `fix/<name>` | Bug fixes | Pull request into `dev` |
| `chore/<name>` | Tooling, docs, repo setup | Pull request into `dev` |

Never commit directly to `main` or `dev`.

## Workflow

1. Start from an up-to-date `dev`: `git checkout dev && git pull`.
2. Create a branch: `git checkout -b feature/district-alerts`.
3. Make small, focused commits.
4. Push and open a pull request into `dev`. Fill in the template.
5. Wait for CI to pass, then merge using **Squash and merge**.
6. Delete the branch after merging.

## Commit messages

Use the Conventional Commits style:

```
feat(frontend): add early-warning alerts panel
fix(ml): match train/test split to train.py
style(frontend): restrained dashboard design
docs: explain the branch model
chore: add CI workflow
```

Types: `feat`, `fix`, `style`, `refactor`, `docs`, `test`, `chore`, `data`.

## Releases

1. Open a pull request from `dev` into `main` titled `Release vX.Y.Z`.
2. After CI passes, merge with a **merge commit** (not squash) so the history stays visible.
3. Tag the release: `git tag -a vX.Y.Z -m "Release vX.Y.Z"` then `git push origin vX.Y.Z`.
4. Create a GitHub Release from the tag and copy the notes from `CHANGELOG.md`.

Version numbers: `0.x` while the project uses synthetic data. Move to `1.0.0` only after validation on real survey data.

## Data and privacy rules

- Never commit real household data, personal identifiers, secrets or `.env` files.
- Anything built from synthetic data must say so in the interface and in documentation.
- Model changes must re-run `ml/pipeline/explain.py` so fairness and driver reports stay current.

## Before opening a pull request

```
cd frontend
npm run build
cd ..
python -m compileall -q ml/pipeline
```