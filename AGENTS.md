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

## Application rules
- Keep the offer editor client-side and session-scoped; no account or persistent collection is required for editing and exporting a single sign.
- Render offer artwork with the shared SVG component for both previews and PNG export so product details stay consistent across outputs.
- Store the color mode independently of the sign model so changing palettes preserves edited details and works for every model and output.
- Keep paper dimensions and price parsing in the shared offer-sign module so print and export use the same values.
- Define visual tokens and editor styling in the global design system, including standalone SVG colors for portable exports.
