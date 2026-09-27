<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules

- Account deletion runs only on Lovable hosting (`/api/public/account/delete`, bearer-token verified, CORS allowlist); Vercel/Android clients call it cross-origin via `src/lib/account-api.ts`. Why: the service-role key exists only on Lovable hosting, never on the Vercel deployment.
