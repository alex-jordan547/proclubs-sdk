# Publication npm

Le package `proclubs-sdk@0.1.0` est prêt à être publié manuellement.
Cette page prépare la première publication ; elle ne la déclenche pas.

## État déjà vérifié

- dépôt public : https://github.com/alex-jordan547/proclubs-sdk
- `main` = `40ca55ed768e0e010565e26601a5a49604607d96`
- nom npm `proclubs-sdk` encore libre (`404` sur le registry)
- licence MIT, `publishConfig.access=public`, `prepublishOnly=npm run build`
- `npm run check` : 19 tests, lint, typecheck, build, pack dry-run
- tarball : 13 fichiers, ~7.9 kB, `LICENSE` + `README.md` + `dist` + `package.json`

## Blocage restant

Cette machine n'est pas authentifiée sur npm :

```text
npm whoami
# ENEEDAUTH — This command requires you to be logged in.
```

La publication doit donc être lancée après `npm login` sur un compte qui
peut créer un package public.

## Commande à lancer après validation

Depuis `/Users/alexjordan/Documents/Developer/proclubs-sdk`, sur `main` à jour :

```bash
npm login
npm whoami
git rev-parse HEAD
# doit afficher 40ca55ed768e0e010565e26601a5a49604607d96 tant que main n'a pas bougé
npm publish --access public --dry-run
npm publish --access public --provenance
npm view proclubs-sdk version
```

`--provenance` attache l'attestation npm au commit GitHub. Si le compte npm
ne le supporte pas, relancer sans ce flag :

```bash
npm publish --access public
```

Ne pas taguer, ne pas bump la version et ne pas republier `0.1.0` après coup.
