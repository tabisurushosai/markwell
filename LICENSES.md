# Third-Party Licenses

This file lists **production** npm dependencies of Markwell, as reported by:

```bash
npx license-checker --production --json
```

Generated from `license-checker` output on 2026-05-18. Do not edit license names by hand; re-run the command above and regenerate this table when dependencies change.

Markwell itself is licensed under the [MIT License](./LICENSE).

## Dependency table

| Package | Version | License | Repository |
|---------|---------|---------|------------|
| `@lit-labs/ssr-dom-shim` | 1.6.0 | BSD-3-Clause | https://github.com/lit/lit |
| `@lit/reactive-element` | 2.1.2 | BSD-3-Clause | https://github.com/lit/lit |
| `@types/trusted-types` | 2.0.7 | MIT | https://github.com/DefinitelyTyped/DefinitelyTyped |
| `argparse` | 2.0.1 | Python-2.0 | https://github.com/nodeca/argparse |
| `entities` | 4.5.0 | BSD-2-Clause | https://github.com/fb55/entities |
| `linkify-it` | 5.0.0 | MIT | https://github.com/markdown-it/linkify-it |
| `lit` | 3.3.3 | BSD-3-Clause | https://github.com/lit/lit |
| `lit-element` | 4.2.2 | BSD-3-Clause | https://github.com/lit/lit |
| `lit-html` | 3.3.3 | BSD-3-Clause | https://github.com/lit/lit |
| `markdown-it` | 14.1.1 | MIT | https://github.com/markdown-it/markdown-it |
| `mdurl` | 2.0.0 | MIT | https://github.com/markdown-it/mdurl |
| `punycode.js` | 2.3.1 | MIT | https://github.com/mathiasbynens/punycode.js |
| `rangy` | 1.3.2 | MIT | https://github.com/timdown/rangy |
| `uc.micro` | 2.1.0 | MIT | https://github.com/markdown-it/uc.micro |
| `ulid` | 2.4.0 | MIT | https://github.com/ulid/javascript |
| `zod` | 3.25.76 | MIT | https://github.com/colinhacks/zod |

## License scan notes

- **GPL / AGPL / LGPL:** None reported in the production tree.
- **Expected permissive set (MIT, Apache-2.0, BSD, ISC, 0BSD):** All packages except `argparse@2.0.1`, which `license-checker` reports as **Python-2.0** (transitive dependency of `markdown-it`). Review compatibility before release if your policy requires only MIT/Apache/BSD/ISC/0BSD.
