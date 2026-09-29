<?php
/**
 * Front controller: reverse-proxies Apache/PHP -> Node.js app on 127.0.0.1:3417
 * Used because this host has no mod_proxy / Passenger.
 */
$NODE_HOST = '127.0.0.1';
$NODE_PORT = 3417;
$TARGET    = 'http://' . $NODE_HOST . ':' . $NODE_PORT;

// This host sets max_execution_time=30, which kills this script mid-upload
// (PHP reports the dropped connection to the app as "Request aborted" and the
// visitor gets a bogus "site is restarting" page). Proxying a slow upload
// legitimately takes longer than that, so the limit is lifted here.
@set_time_limit(0);
@ini_set('max_execution_time', '0');

$uri  = $_SERVER['REQUEST_URI'] ?? '/';
$meth = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

$skip = [
    'host', 'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
    'te', 'trailer', 'transfer-encoding', 'upgrade', 'content-length', 'expect',
    'accept-encoding',
];

$headers = [];
foreach ($_SERVER as $k => $v) {
    if (strpos($k, 'HTTP_') === 0) {
        $name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($k, 5)))));
        if (in_array(strtolower($name), $skip, true)) continue;
        $headers[] = $name . ': ' . $v;
    }
}
if (!empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}

// Page requests must fail fast so visitors get an error instead of the browser
// sitting on a blank screen for 10 minutes. Large media uploads (the project
// and blog videos are tens of MB) legitimately need much longer.
$contentLength = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
// Slightly larger than the original body once multipart boundaries are rebuilt.
$bodySizeHint = (int)($contentLength * 1.05) + 4096;
$isWrite       = in_array($meth, ['POST', 'PUT', 'PATCH', 'DELETE'], true);
if ($isWrite) {
    // Blog/project posts carry an image or a ~70 MB video. Assume a pessimistic
    // 50 KB/s (this host is ~210 ms away), one second per 50 KB, then bound it.
    $reqTimeout = (int)min(1800, max(300, (int)ceil(max($contentLength, $bodySizeHint) / 51200)));
} else {
    // A page view should either answer or fail quickly - never hang a browser
    // for the ten minutes the original 600 s timeout allowed.
    $reqTimeout = 30;
}

$ch = curl_init($TARGET . $uri);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST  => $meth,
    CURLOPT_RETURNTRANSFER => false,
    CURLOPT_HEADER         => false,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CONNECTTIMEOUT => 5,
    CURLOPT_TIMEOUT        => $reqTimeout,
    CURLOPT_HTTPHEADER     => $headers,
    CURLOPT_BUFFERSIZE     => 65536,
]);

$isHead = ($meth === 'HEAD');
if ($isHead) {
    curl_setopt($ch, CURLOPT_NOBODY, true);
} else {
    // let curl negotiate + transparently decode compression
    curl_setopt($ch, CURLOPT_ENCODING, '');
}

$hasBody = in_array($meth, ['POST', 'PUT', 'PATCH', 'DELETE'], true)
    && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0;
$in = null;
$bodyFile = null;
$bodySize = 0;
if ($hasBody) {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';

    // For multipart/form-data PHP consumes the raw body itself and leaves
    // php://input EMPTY, so streaming it upstream silently forwards nothing and
    // the app waits for a body that never arrives. That is why every file
    // upload hung until it timed out.
    //
    // enable_post_data_reading is PHP_INI_PERDIR and php_value is ignored under
    // PHP-FPM, so the body cannot be recovered at source. Rebuild it here from
    // the parts PHP did keep: every field of $_POST plus every $_FILES entry,
    // whose temp file still holds the uploaded bytes in full.
    if (stripos($contentType, 'multipart/form-data') === 0) {
        $boundary = '----UzafastaProxy' . bin2hex(random_bytes(8));
        $spool = tempnam(sys_get_temp_dir(), 'uzapx');
        $out = fopen($spool, 'w+b');
        $sep = '--' . $boundary . "\r\n";

        foreach ($_POST as $k => $v) {
            if (is_array($v)) {
                foreach ($v as $sub => $sv) {
                    fwrite($out, $sep . 'Content-Disposition: form-data; name="'
                        . str_replace(['\"', "\r", "\n"], ['', '', ''], $k . '[' . $sub . ']') . "\"\r\n\r\n" . $sv . "\r\n");
                }
            } else {
                fwrite($out, $sep . 'Content-Disposition: form-data; name="'
                    . str_replace(['\"', "\r", "\n"], ['', '', ''], (string)$k) . "\"\r\n\r\n" . $v . "\r\n");
            }
        }

        foreach ($_FILES as $field => $file) {
            if (is_array($file['name'])) {
                $names = $file['name'];
                $paths = $file['tmp_name'];
                $types = $file['type'];
                foreach ($names as $i => $fname) {
                    fwrite($out, $sep . 'Content-Disposition: form-data; name="'
                        . str_replace(['\"', "\r", "\n"], ['', '', ''], $field . '[]') . '"; filename="'
                        . str_replace(['\"', "\r", "\n"], ['', '', ''], (string)$fname) . "\"\r\n");
                    fwrite($out, 'Content-Type: ' . ($types[$i] ?: 'application/octet-stream') . "\r\n\r\n");
                    if (is_uploaded_file($paths[$i])) {
                        stream_copy_to_stream(fopen($paths[$i], 'rb'), $out);
                    }
                    fwrite($out, "\r\n");
                }
            } else {
                if ((int)$file['error'] === UPLOAD_ERR_OK && is_uploaded_file($file['tmp_name'])) {
                    fwrite($out, $sep . 'Content-Disposition: form-data; name="'
                        . str_replace(['\"', "\r", "\n"], ['', '', ''], (string)$field) . '"; filename="'
                        . str_replace(['\"', "\r", "\n"], ['', '', ''], (string)$file['name']) . "\"\r\n");
                    fwrite($out, 'Content-Type: ' . ($file['type'] ?: 'application/octet-stream') . "\r\n\r\n");
                    stream_copy_to_stream(fopen($file['tmp_name'], 'rb'), $out);
                    fwrite($out, "\r\n");
                }
            }
        }
        fwrite($out, '--' . $boundary . "--\r\n");
        fclose($out);

        $bodyFile = $spool;
        $bodySize = filesize($spool);
        // Drop the original Content-Type: it carries the OLD boundary, and a
        // duplicated header makes multer parse against the wrong delimiter
        // ("Unexpected end of form"). Our rebuilt boundary is the only one.
        $headers = array_values(array_filter($headers, function ($h) {
            return stripos($h, 'Content-Type:') !== 0;
        }));
        $headers[] = 'Content-Type: multipart/form-data; boundary=' . $boundary;
        // CURLOPT_HTTPHEADER was already applied by value in curl_setopt_array,
        // so the rebuilt Content-Type must be re-applied here or Node parses the
        // body against the old boundary and busboy reports "Unexpected end of form".
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_UPLOAD, true);
        curl_setopt($ch, CURLOPT_INFILE, fopen($spool, 'rb'));
        curl_setopt($ch, CURLOPT_INFILESIZE, $bodySize);
    } else {
        $in = fopen('php://input', 'rb');
        curl_setopt($ch, CURLOPT_UPLOAD, true);
        curl_setopt($ch, CURLOPT_INFILE, $in);
        curl_setopt($ch, CURLOPT_INFILESIZE, (int)$_SERVER['CONTENT_LENGTH']);
        curl_setopt($ch, CURLOPT_READFUNCTION, function ($ch, $fd, $len) use ($in) {
            return fread($in, $len);
        });
    }
}

// capture the upstream status + forward end-to-end headers
$status = 200;
$curl_err_headers = false;
curl_setopt($ch, CURLOPT_HEADERFUNCTION, function ($ch, $line) use (&$status, &$curl_err_headers) {
    $len = strlen($line);
    if ($curl_err_headers) return $len;   // skip trailers/extra header blocks
    $trim = trim($line);
    if ($trim === '') { return $len; }
    if (stripos($trim, 'HTTP/') === 0) {
        $code = 0;
        if (preg_match('#^HTTP/[\d.]+\s+(\d{3})#', $trim, $m)) {
            $status = (int)$m[1];
            // 1xx informational / 100-continue: don't finalise yet
            if ($status < 200) return $len;
        }
        // any further status line (redirect chain we don't follow) ends the block
        $curl_err_headers = false;
        return $len;
    }
    foreach (['transfer-encoding', 'connection', 'keep-alive', 'content-length'] as $h) {
        if (stripos($trim, $h . ':') === 0) return $len;
    }
    header($trim, false);
    return $len;
});

$started = false;
$begin = function () use (&$started, &$status) {
    if ($started) return;
    if (!headers_sent()) http_response_code($status);
    $started = true;
};

curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use ($begin) {
    $begin();
    echo $data;
    return strlen($data);
});

$ok = curl_exec($ch);
$errno = curl_errno($ch);
$err   = curl_error($ch);
$code  = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);
if (is_resource($in)) fclose($in);
if ($bodyFile && is_file($bodyFile)) @unlink($bodyFile);

if ($ok === false || $code === 0) {
    // errno 28 = our own timeout, not an outage. Saying "the site is
    // restarting" here was misleading: Node was healthy the whole time.
    $timedOut  = ($errno === 28);
    $httpCode  = $timedOut ? 504 : 503;
    if (!headers_sent()) {
        http_response_code($httpCode);
        header('Content-Type: text/html; charset=utf-8');
    }
    // Log the detail server-side; never expose hostnames, ports or commands
    // to the public.
    error_log(sprintf('uzafasta proxy: cannot reach node (%s:%s) errno %d: %s',
        $NODE_HOST, $NODE_PORT, $errno, $err));
    $title = $timedOut ? '504 - Gateway Timeout' : '503 - Service temporarily unavailable';
    $note  = $timedOut
        ? 'This upload took too long to process. The site is fine - please try again.'
        : 'The site is restarting. Please try again in a few seconds.';
    echo '<!doctype html><title>' . $title . '</title>'
       . '<div style="font:16px/1.6 system-ui,sans-serif;max-width:36rem;margin:4rem auto;padding:0 1.5rem">'
       . '<h1 style="font-size:1.5rem">' . $title . '</h1>'
       . '<p>' . $note . '</p>'
       . '</div>';
    exit;
}

$begin();
