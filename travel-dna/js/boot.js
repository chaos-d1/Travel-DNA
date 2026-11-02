(function () {
    var boot = document.getElementById('boot');
    if (!boot) return;
    document.body.classList.add('is-booting');

    var start = Date.now(), MIN_MS = 1200, MAX_MS = 3500, finished = false;

    function finish() {
        if (finished) return;
        finished = true;
        // Hold the rest of the minimum beat, then dissolve.
        setTimeout(function () {
            boot.classList.add('is-done');
            document.body.classList.remove('is-booting');
            setTimeout(function () { boot.remove(); }, 700);
        }, Math.max(0, MIN_MS - (Date.now() - start)));
    }

    if (document.readyState === 'complete') finish();
    else window.addEventListener('load', finish);

    // Map tiles and search proxies can hang indefinitely. The loading
    // screen must never be the thing that blocks the page.
    setTimeout(finish, MAX_MS);
})();
