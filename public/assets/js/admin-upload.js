/* Client-side image compression for admin uploads.
 *
 * This host's Apache rejects any request body larger than 1 MiB with
 * "413 Request Entity Too Large" before the request reaches PHP, so a normal
 * 2 MB camera/phone cover photo could never be saved. The limit is set in a
 * root-owned config and cPanel's AllowOverride blocks .htaccess, so the fix
 * has to happen here: shrink the file in the browser before it is sent.
 *
 * Videos are left alone - they are streamed, not buffered, and still cannot
 * exceed the same 1 MiB cap (see the note printed next to the video field).
 */
(function () {
  var MAX_EDGE = 1600;        // plenty for a full-width blog cover
  var QUALITY  = 0.82;
  var TARGET   = 900 * 1024;  // aim well under the 1 MiB server cap

  function human(bytes) {
    return bytes > 1048576
      ? (bytes / 1048576).toFixed(1) + ' MB'
      : Math.round(bytes / 1024) + ' KB';
  }

  function loadImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('not an image')); };
      img.src = url;
    });
  }

  function compress(file) {
    return loadImage(file).then(function (img) {
      var w = img.naturalWidth, h = img.naturalHeight;
      var scale = Math.min(1, MAX_EDGE / Math.max(w, h));
      var cw = Math.max(1, Math.round(w * scale));
      var ch = Math.max(1, Math.round(h * scale));

      var canvas = document.createElement('canvas');
      canvas.width = cw; canvas.height = ch;
      var ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);

      var quality = QUALITY;
      var dataUrl = canvas.toDataURL('image/jpeg', quality);
      // step the quality down if we are still over the server's cap
      while (dataUrl.length * 0.75 > TARGET && quality > 0.5) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL('image/jpeg', quality);
      }

      var binary = atob(dataUrl.split(',')[1]);
      var bytes = new Uint8Array(binary.length);
      for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

      var name = file.name.replace(/\.[^.]+$/, '') + '.jpg';
      return {
        file: new File([bytes], name, { type: 'image/jpeg' }),
        before: file.size, after: bytes.length, w: cw, h: ch
      };
    });
  }

  function status(input, msg, isError) {
    var el = input.parentNode.querySelector('.js-img-status');
    if (!el) {
      el = document.createElement('small');
      el.className = 'js-img-status d-block mt-1 ' + (isError ? 'text-danger' : 'text-muted');
      input.parentNode.appendChild(el);
    }
    el.textContent = msg;
  }

  document.addEventListener('change', function (e) {
    var input = e.target;
    if (!input.matches || !input.matches('input[type="file"][name="cover_image"]')) return;
    var file = input.files && input.files[0];
    if (!file || !/^image\//.test(file.type)) return;

    if (file.size <= TARGET) {
      status(input, human(file.size) + ' - already small enough, uploaded as-is.');
      return;
    }

    status(input, 'Compressing ' + human(file.size) + '...');
    compress(file).then(function (r) {
      var dt = new DataTransfer();
      dt.items.add(r.file);
      input.files = dt.files;
      status(input, 'Compressed ' + human(r.before) + ' to ' + human(r.after) +
                   ' (' + r.w + '\u00d7' + r.h + '). The original was over the ' +
                   '1 MB upload limit.');
    }).catch(function () {
      status(input, 'Could not compress this image automatically. ' +
                   'Please resize it to under 1 MB before uploading.', true);
    });
  });
})();
