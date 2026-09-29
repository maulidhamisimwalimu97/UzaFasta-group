/* Client-side upload guard + image compression for the admin forms.
 *
 * This host's Apache rejects any request body larger than 1 MiB (1048576
 * bytes) with a raw, unstyled "413 Request Entity Too Large" page BEFORE the
 * request reaches PHP or Node. The limit is set in a root-owned config and
 * cPanel's AllowOverride ignores LimitRequestBody in .htaccess, so it cannot
 * be raised from the account and has to be worked around in the browser.
 *
 * Two things made posts fail even with compression in place:
 *
 *   1. The 1 MiB cap applies to the WHOLE multipart body, not just the image.
 *      Budgeting 900 KB for the file alone left only ~127 KB for the title,
 *      body, excerpt and every multipart boundary, so a normal-length article
 *      still tipped the request over the cap.
 *   2. The video field accepted any file. A 70 MB clip can never fit, and it
 *      silently poisoned every post that had one attached.
 *
 * So: images are compressed against a budget derived from what the rest of the
 * form is sending, videos are refused with an explanation, and the assembled
 * body is measured before submit so the user gets a real error message instead
 * of Apache's blank 413.
 */
(function () {
  var SERVER_CAP  = 1048576;   // hard cap on the total request body
  var SAFETY      = 24 * 1024; // leave room for boundaries, headers, filenames
  var IMAGE_BUDGET = 700 * 1024; // target for the image, leaves ~300 KB of text
  var MAX_EDGE    = 1600;      // plenty for a full-width cover
  var QUALITY     = 0.82;

  function human(bytes) {
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  }

  function note(el, msg, isError) {
    if (!el) return;
    el.textContent = msg;
    el.className = el.className.replace(/\btext-(muted|danger)\b/g, '') +
      (isError ? ' text-danger' : ' text-muted');
  }

  function slotFor(input) {
    var parent = input.closest('.form-group') || input.parentNode;
    var el = parent.querySelector('.js-img-status');
    if (!el) {
      el = document.createElement('small');
      el.className = 'js-img-status d-block mt-1 text-muted';
      parent.appendChild(el);
    }
    return el;
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('decode')); };
      img.src = url;
    });
  }

  function toJpeg(img, quality) {
    var canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    var ctx = canvas.getContext('2d');
    // JPEG has no alpha, so flatten onto white instead of leaving black boxes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/jpeg', quality);
  }

  function compress(file, budget) {
    return loadImage(file).then(function (img) {
      var scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      var small = {
        width: Math.max(1, Math.round(img.naturalWidth * scale)),
        height: Math.max(1, Math.round(img.naturalHeight * scale))
      };
      var canvas = document.createElement('canvas');
      canvas.width = small.width;
      canvas.height = small.height;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, small.width, small.height);
      ctx.drawImage(img, 0, 0, small.width, small.height);

      var quality = QUALITY;
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      // base64 is ~4/3 of the binary payload, so this estimates the real size
      while (dataUrl.length * 0.75 > budget && quality > 0.4) {
        quality = Math.round((quality - 0.08) * 100) / 100;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      var binary = atob(dataUrl.split(',')[1]);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      return {
        file: new File([bytes], file.name.replace(/\.[^.]+$/, '') + '.jpg',
                       { type: 'image/jpeg' }),
        before: file.size,
        after: bytes.length,
        w: small.width,
        h: small.height
      };
    });
  }

  function swapFile(input, file) {
    // DataTransfer is how you write a File back into a file input; it is
    // unavailable in older Safari, so surface that rather than silently
    // leaving the oversized original in place.
    if (typeof DataTransfer !== 'function') {
      throw new Error('DataTransfer unsupported');
    }
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
  }

  function firstFile(input) {
    return input && input.files && input.files[0];
  }

  // Text fields are cheap to measure and decide how much room the image gets.
  function textBudget(form) {
    var bytes = 0;
    var fields = form.querySelectorAll('input[type=text], textarea, select');
    for (var i = 0; i < fields.length; i++) {
      bytes += (fields[i].value || '').length;
    }
    return Math.max(64 * 1024, IMAGE_BUDGET - bytes);
  }

  function handleImage(input) {
    var file = firstFile(input);
    if (!file || !/^image\//.test(file.type)) return;
    var el = slotFor(input);
    var form = input.form;

    if (file.size <= IMAGE_BUDGET) {
      note(el, human(file.size) + ' - under the limit, uploading as-is.');
      return;
    }

    var budget = textBudget(form);
    note(el, 'Compressing ' + human(file.size) + '...');
    compress(file, budget).then(function (r) {
      swapFile(input, r.file);
      note(el, 'Compressed ' + human(r.before) + ' to ' + human(r.after) + ' (' +
        r.w + '\u00d7' + r.h + '). The original was over this host\u2019s 1 MB limit.');
    }).catch(function () {
      note(el, 'Could not compress this image automatically. Please resize it to ' +
        'under 1 MB (or about 700 KB to leave room for your text) and try again.', true);
    });
  }

  function handleVideo(input) {
    var file = firstFile(input);
    if (!file) return;
    var el = slotFor(input);
    // Refuse rather than let a 70 MB clip 413 the entire post.
    input.value = '';
    note(el, 'Video files are not accepted: this host caps every upload at 1 MB, so a ' +
      'clip can never be sent. Clear the video field and paste a link instead.', true);
  }

  // Final gate: measure what would actually be sent, so the user gets a real
  // message instead of Apache's blank 413 page.
  function guardSubmit(form) {
    var err = form.querySelector('.js-img-status-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'js-img-status-error alert alert-danger d-none mt-2';
      form.appendChild(err);
    }
    err.classList.add('d-none');

    var fd = new FormData(form);
    var total = 0;
    fd.forEach(function (value, key) {
      if (key === 'video_file' && value && value.size) {
        err.textContent = 'This host caps uploads at 1 MB, so video files cannot be sent. ' +
          'Remove the video file and paste a video URL instead.';
        err.classList.remove('d-none');
        form.addEventListener('submit', blockOnce);
        return;
      }
      total += (value && value.size !== undefined) ? value.size : String(value).length;
    });

    if (total + SAFETY > SERVER_CAP) {
      err.textContent = 'This upload would be ' + human(total) + ' but this host only ' +
        'accepts ' + human(SERVER_CAP) + ' per request. Use a smaller cover image ' +
        '(under 700 KB) and try again.';
      err.classList.remove('d-none');
      form.addEventListener('submit', blockOnce);
    }
  }

  function blockOnce(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input || !input.matches || !input.matches('input[type="file"]')) return;
    if (input.name === 'cover_image') handleImage(input);
    else if (input.name === 'video_file') handleVideo(input);
  });

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form && form.matches && form.matches('form')) guardSubmit(form);
  });
})();
