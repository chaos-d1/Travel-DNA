# Travel DNA — India Place Explorer

## Run it
1. In VS Code: **File → Open Folder…** and choose this folder.
2. Install the recommended **Live Server** extension (VS Code will prompt you).
3. Right-click `index.html` → **Open with Live Server**.

Run it through a local server rather than double-clicking the file. The camera
needs a secure context (`localhost`), and the WebLLM chatbot is an ES module,
which browsers block on `file://`.

## Structure
```
index.html          page markup
css/styles.css      all styling
js/theme-init.js    applies saved theme before first paint
js/boot.js          loading-screen logic
js/app.js           main app: map, themes, itinerary, place data
js/camera.js        camera snapshot feature
js/chatbot.js       WebLLM chatbot (ES module)
```

Leaflet, Google Fonts and WebLLM still load from CDNs, so you need an internet connection.
