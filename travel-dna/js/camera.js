/* ---------- Camera snapshot ----------
   Device support for getUserMedia is uneven: it needs a secure context
   (https or localhost), it is missing entirely in several in-app
   browsers (Instagram, some Android WebViews), and iOS refuses to play
   the stream unless the <video> is muted + playsinline. Every one of
   those cases falls back to <input capture>, which hands the job to the
   OS camera app and works essentially everywhere. */
(function(){
  const openBtn  = document.getElementById('travelDnaCameraButton');
  const modal    = document.getElementById('travelDnaCamera');
  const closeBtn = document.getElementById('travelDnaCameraClose');
  const stage    = document.getElementById('camStage');
  const video    = document.getElementById('camVideo');
  const canvas   = document.getElementById('camCanvas');
  const note     = document.getElementById('camNote');
  const shoot    = document.getElementById('camShoot');
  const flip     = document.getElementById('camFlip');
  const retake   = document.getElementById('camRetake');
  const save     = document.getElementById('camSave');
  const upload   = document.getElementById('camUploadLabel');
  const fileIn   = document.getElementById('travelDnaCameraFile');

  if (!openBtn || !modal || !video || !canvas) return;

  let stream = null;
  let facing = 'environment';
  let hasShot = false;

  const supportsStream = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  const secure = window.isSecureContext ||
                 location.protocol === 'https:' ||
                 ['localhost', '127.0.0.1'].includes(location.hostname);

  function setNote(text, isError) {
    note.textContent = text;
    note.classList.toggle('error', !!isError);
  }

  function showShotControls(on) {
    hasShot = on;
    stage.classList.toggle('has-shot', on);
    shoot.hidden = on;
    retake.hidden = !on;
    save.hidden = !on;
    flip.hidden = on || !stream;
  }

  function stopStream() {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }

  // The OS-camera path is the universal fallback. It is offered whenever
  // the live preview can't run, and also stays available alongside it.
  function offerFallback(reason) {
    stopStream();
    shoot.disabled = true;
    flip.hidden = true;
    upload.hidden = false;
    setNote(reason + ' Tap "Use device camera" to take a photo with your camera app instead.', true);
  }

  async function startStream() {
    if (!supportsStream || !secure) {
      offerFallback(!secure
        ? 'A live preview needs a secure (https) connection.'
        : 'This browser does not support in-page camera preview.');
      return;
    }
    stopStream();
    setNote('Starting camera\u2026');
    shoot.disabled = true;

    // Ask for the preferred camera, then retry without the facing
    // constraint: many laptops and some phones have only one camera and
    // reject an exact facingMode outright.
    const attempts = [
      { video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1707 } }, audio: false },
      { video: { facingMode: facing }, audio: false },
      { video: true, audio: false },
    ];

    let lastError = null;
    for (const constraints of attempts) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!stream) {
      const name = lastError && lastError.name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        offerFallback('Camera permission was denied.');
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        offerFallback('No camera was found on this device.');
      } else if (name === 'NotReadableError') {
        offerFallback('The camera is already in use by another app.');
      } else {
        offerFallback('The camera could not be started.');
      }
      return;
    }

    video.srcObject = stream;
    // iOS Safari needs an explicit play() and rejects it silently if the
    // element was not muted + playsinline at parse time.
    try { await video.play(); } catch { /* autoplay attribute covers it */ }

    shoot.disabled = false;
    upload.hidden = false;

    // Only offer the flip control when there really is more than one camera.
    let multiple = false;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      multiple = devices.filter(d => d.kind === 'videoinput').length > 1;
    } catch { /* enumerateDevices can be blocked; leave flip hidden */ }
    flip.hidden = !multiple;

    setNote('Framing looks good \u2014 tap Capture when ready.');
  }

  function capture() {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) { setNote('The camera is still warming up \u2014 try again in a moment.', true); return; }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    // A front camera preview is mirrored on screen, so mirror the capture
    // back or the saved photo comes out flipped relative to what was seen.
    if (facing === 'user') {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    showShotControls(true);
    setNote('Captured. Save it, or retake.');
  }

  function drawFromFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.getContext('2d').drawImage(image, 0, 0);
        showShotControls(true);
        setNote('Photo loaded. Save it, or take another.');
      };
      image.onerror = () => setNote('That photo could not be read.', true);
      image.src = reader.result;
    };
    reader.onerror = () => setNote('That photo could not be read.', true);
    reader.readAsDataURL(file);
  }

  function saveShot() {
    const place = (document.getElementById('sharedLocationInput')?.value || 'travel-dna')
      .trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'travel-dna';
    // toBlob keeps large captures off the main thread and avoids the
    // data-URL length limits that break downloads on some browsers.
    canvas.toBlob(blob => {
      if (!blob) { setNote('The snapshot could not be saved.', true); return; }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${place}-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNote('Saved to your downloads.');
    }, 'image/png');
  }

  function open() {
    modal.classList.add('open');
    showShotControls(false);
    upload.hidden = false;
    startStream();
  }

  function close() {
    modal.classList.remove('open');
    stopStream();
    showShotControls(false);
  }

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal.classList.contains('open')) close();
  });

  shoot.addEventListener('click', capture);
  save.addEventListener('click', saveShot);
  retake.addEventListener('click', () => {
    showShotControls(false);
    fileIn.value = '';
    if (stream) setNote('Framing looks good \u2014 tap Capture when ready.');
    else startStream();
  });

  flip.addEventListener('click', () => {
    facing = facing === 'environment' ? 'user' : 'environment';
    startStream();
  });

  fileIn.addEventListener('change', () => {
    const file = fileIn.files && fileIn.files[0];
    if (file) drawFromFile(file);
  });
})();
