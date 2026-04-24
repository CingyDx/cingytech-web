# CingyTech project instructions

This is a static HTML/CSS/JS website deployed through Netlify from GitHub.

## Deploy workflow

When the user says "updatni web", do this:

1. Run `git status`.
2. Show the user which files changed.
3. Run `git add .`.
4. Create a short meaningful commit message based on the changes.
5. Run `git commit -m "<message>"`.
6. Run `git push`.

Never push before showing the changed files.
Do not rewrite history or force-push unless the user explicitly asks.
Do not add secrets, API keys, passwords, or private files to the repository.

## Netlify

Netlify automatically deploys the website after every successful push to the `main` branch.
There is no build command.
Publish directory is the repository root: `.`