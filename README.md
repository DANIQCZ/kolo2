# Kolo štěstí (s 100% drop)

Barevné webové kolo štěstí s těmito funkcemi:
- 100% výhra pro jméno zadané v poli "Guaranteed winner (100% drop)"
- Ruční seznam jmen (každé na nový řádek), Shuffle/Sort
- Kliknutím na kolo nebo Ctrl+Enter spustíš spin
- Velká šipka ukazuje výsledek, zvuky tiku a fanfára při výhře
- Výherní dialog se jménem + tlačítka Remove/Remove all a volba "Remove winner slice after draw"

## Jak spustit
1. Otevři `index.html` v prohlížeči (např. dvojklik nebo jednoduchý HTTP server)
2. Napiš jména do pravého panelu (každé na nový řádek)
3. Volitelně vyplň "Guaranteed winner (100% drop)" – musí přesně odpovídat jednomu ze jmen (bez ohledu na velikost písmen)
4. Klikni na kolo nebo stiskni Ctrl+Enter

Pokud chceš lokální server:

```bash
# z kořenového adresáře projektu
python3 -m http.server 8000
# otevři v prohlížeči: http://localhost:8000/
```

## Úpravy
- Styl a rozměry šipky najdeš ve `styles.css` v třídě `.pointer`.
- Vstupní zvuky jsou generované přes WebAudio API v `main.js` (funkce `createAudio`).
- Po dokončení spinu se výsledek zapíše do seznamu vpravo a otevře se dialog.
