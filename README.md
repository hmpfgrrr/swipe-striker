# Swipe Striker v0.3.2

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

Safari erlaubt die PWA-Installation über eine Netzwerkadresse nur mit HTTPS; `localhost` ist für lokale Tests ausgenommen. Die Anwendung braucht weder Backend noch Login und speichert den Highscore lokal im Browser.

## Audio

Auf dem Spielfeld kann zwischen zwei lokalen Web-Audio-Profilen gewählt werden: `STADION` nutzt eine sehr leise, gekürzte Stadionaufnahme und einen kurzen Crowd-Cheer bei `TOR!`; `ARCADE` nutzt weiterhin kürzere, spielerische Reaktionen. Die Audioausgabe startet erst nach der ersten Berührung, damit sie mit den Autoplay-Regeln moderner Browser kompatibel bleibt.

Die lokalen MP3-Dateien basieren auf [Soccer Stadium 10](https://pixabay.com/sound-effects/city-soccer-stadium-10-6709/) und [Crowd Cheering](https://pixabay.com/sound-effects/people-crowd-cheering-379666/), jeweils als kostenlos nutzbar unter der Pixabay Content License. Für die PWA wurden die Ausschnitte auf 12 beziehungsweise 2,3 Sekunden gekürzt und als Mono-MP3 mit 64 kbps gespeichert; beim Jubel wurde der stille Vorlauf entfernt.

Die produktiv bereitgestellte PWA prüft beim Start und bei der Rückkehr in die App auf eine neue Version. Wenn ein Update bereitsteht, erscheint ein Hinweis mit `JETZT AKTUALISIEREN`; danach wird der neue Service Worker aktiviert und die App einmal neu geladen. Im Vite-Entwicklungsserver ist diese Prüfung deaktiviert. Beim Verlassen oder Verstecken der App wird die Audiowiedergabe pausiert.

## Steuerung

Der Finger muss nahe am Ball starten und mindestens 80 Pixel in Richtung Tor wischen. Eine seitliche Bewegung gibt dem Ball Drall; daraus entsteht eine einzige glatte Kurve ohne scharfe Haken oder Rückwärtsbewegung. Verteidiger bewegen sich in ihren Zonen, reagieren auf den Schuss und der Torwart hechtet zur erwarteten Torposition. Nach `TOR!`, `GEHALTEN`, `GEBLOCKT`, `AUS` oder `DANEBEN` kann die Szene über „NOCHMAL“ zurückgesetzt werden.
