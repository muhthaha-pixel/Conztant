# Minimal static file server for local testing (no Node/Python needed).
# Usage:  powershell -ExecutionPolicy Bypass -File serve.ps1   then open http://localhost:8080/
param([int]$Port = 8080)
$root = $PSScriptRoot
$mime = @{ '.html'='text/html; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.js'='application/javascript; charset=utf-8';
           '.json'='application/json'; '.svg'='image/svg+xml'; '.png'='image/png'; '.ico'='image/x-icon'; '.md'='text/plain; charset=utf-8' }
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
$listener.Start()
Write-Host "Serving $root at http://localhost:$Port/  (Ctrl+C to stop)"
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $res = $ctx.Response
    try {
      $path = [uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
      if ($path -eq '/') { $path = '/index.html' }
      $file = Join-Path $root ($path.TrimStart('/') -replace '/', '\')
      $full = [IO.Path]::GetFullPath($file)
      if ((Test-Path $full -PathType Leaf) -and $full.StartsWith($root, [StringComparison]::OrdinalIgnoreCase)) {
        [byte[]]$bytes = [IO.File]::ReadAllBytes($full)
        $ext = [IO.Path]::GetExtension($full).ToLower()
        $type = $mime[$ext]
        if (-not $type) { $type = 'application/octet-stream' }
        $res.StatusCode = 200
        $res.ContentType = $type
        $res.ContentLength64 = [int64]$bytes.LongLength
        if ($ctx.Request.HttpMethod -ne 'HEAD') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
        Write-Host "200 $path ($($bytes.Length) bytes)"
      } else {
        $res.StatusCode = 404
        Write-Host "404 $path"
      }
    } catch {
      Write-Host "ERR $path : $($_.Exception.Message)"
      try { $res.StatusCode = 500 } catch {}
    } finally {
      try { $res.Close() } catch {}
    }
  }
} finally { $listener.Stop() }
