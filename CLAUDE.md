# Lexique

PWA de révision de vocabulaire à répétition espacée (anglais, italien, français), pour un seul
utilisateur francophone, utilisée surtout sur iPhone. Pas de backend : le contenu des cartes est
dans `cards/*.json` et part dans le build ; la progression (états FSRS, journal, file « à enrichir »)
vit dans IndexedDB sur l'appareil.

## Commandes

Sur ce Mac, Node est dans `~/.local/node/bin` et `gh` dans `~/.local/bin` (hors du PATH par défaut) :

    export PATH="$HOME/.local/node/bin:$HOME/.local/bin:$PATH"
    npm run dev        # http://localhost:5173/lexique/
    npm run validate   # vérifie cards/*.json
    npm run build      # validation + tsc + build de production

Un push sur `main` déploie sur GitHub Pages (`.github/workflows/deploy.yml`).

## Format d'une carte

Une entrée par mot dans `cards/en.json`, `cards/it.json` ou `cards/fr.json` :

    {
      "word": "perfunctory",
      "lang": "en",
      "pos": "adj.",
      "definition": "Done quickly and without real interest or care, only because it is expected.",
      "examples": [
        "The guard gave my bag a *perfunctory* glance and waved me through.",
        "His apology was so *perfunctory* that it made things worse."
      ],
      "register": "soutenu",
      "translation": "fait pour la forme, expédié, machinal",
      "source": "facultatif : où le mot a été croisé"
    }

Règles, vérifiées par `scripts/validate-cards.mjs` quand c'est possible :

- `definition` : courte, dans la langue du mot, sans le mot lui-même.
- `examples` : exactement deux phrases naturelles ; le mot y est balisé une seule fois `*ainsi*`,
  sous sa forme fléchie s'il le faut (`*biechi*`, `*dwindled*`). La première sert de recto.
- `register` : `courant`, `soutenu` ou `familier`.
- `translation` : en français ; pour un mot français, une glose plus simple.
- Anglais britannique (orthographe et usage) ; la voix de synthèse est en-GB.
- L'identifiant d'une carte est `langue:mot` en minuscules. Renommer un mot lui fait perdre sa
  progression ; corriger sa définition ou ses exemples, non.
- L'ordre du fichier est l'ordre d'introduction des nouveaux mots : ajouter à la fin.

## Enrichir la file

L'écran « Ajouter » met des mots en attente. L'utilisateur colle la file copiée depuis l'app
(`[{ "word", "lang", "source"? }]`). Pour chaque mot : rédiger la carte complète, l'ajouter à la
fin du bon fichier en reprenant `source`, lancer `npm run validate`, puis committer et pousser.
Au prochain lancement, l'app retire d'elle-même de la file les mots présents dans le paquet.

## Repères de code

- `src/lib/session.ts` : composition d'une session (10 nouveaux par jour dosés 6 EN / 2 IT / 2 FR,
  session de 5 minutes, pas d'apprentissage courts rejoués dans la session).
- `src/lib/scheduler.ts` : ts-fsrs v6 (`DefaultScheduler`, rétention 0,9).
- `src/lib/day.ts` : la journée change à 4 h du matin.
- `src/lib/backup.ts` : export/import JSON ; l'import remplace toute la progression.
