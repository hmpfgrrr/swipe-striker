# Swipe Striker v0.1

Ein kleines Fußballspiel für iPhone und Browser: Ziehe vom Ball aus eine Kurve, lasse los und versuche, Torwart und Verteidiger zu überwinden.

## Lokal starten

```bash
npm install
npm run dev
```

Für die Tests und den Produktions-Build:

```bash
npm test -- --run
npm run build
npm run preview
```

## Auf dem iPhone installieren

1. Computer und iPhone ins gleiche WLAN bringen.
2. Den Vite-Entwicklungsserver mit `npm run dev -- --host` starten und die angezeigte Netzwerkadresse in Safari öffnen.
3. In Safari auf „Teilen“ → „Zum Home-Bildschirm“ → „Hinzufügen“ tippen.
4. Das Spiel über das neue Home-Bildschirm-Symbol starten.

Safari erlaubt die PWA-Installation über eine Netzwerkadresse nur mit HTTPS; `localhost` ist für lokale Tests ausgenommen. Die Anwendung braucht weder Backend noch Login und speichert in v0.1 keinen Spielstand.

## Steuerung

Der Finger muss nahe am Ball starten und mindestens 80 Pixel in Richtung Tor wischen. Eine seitliche Bewegung gibt dem Ball Drall; daraus entsteht eine einzige glatte Kurve ohne scharfe Haken oder Rückwärtsbewegung. Verteidiger bewegen sich in ihren Zonen, reagieren auf den Schuss und der Torwart hechtet zur erwarteten Torposition. Nach `TOR!`, `GEHALTEN`, `GEBLOCKT`, `AUS` oder `DANEBEN` kann die Szene über „NOCHMAL SPIELEN“ zurückgesetzt werden.
