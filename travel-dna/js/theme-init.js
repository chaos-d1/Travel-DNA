// Apply the saved theme before anything paints, so the loading screen
// opens in the right palette instead of flashing the default one.
try {
    var savedTheme = localStorage.getItem('travelDNA.theme');
    if (['tropical', 'arid', 'winter'].indexOf(savedTheme) !== -1) {
        document.body.className = 'theme-' + savedTheme;
    }
} catch (e) { /* storage blocked */ }
