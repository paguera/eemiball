# Mini serveur web local pour tester EEMI Ball (aucune installation requise)
# Lancer :  powershell -ExecutionPolicy Bypass -File serve-local.ps1
# Puis ouvrir http://localhost:8080   (Ctrl+C pour arreter)
param([int]$Port = 8080)

$racine = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'public'))
$racineAvecSep = $racine.TrimEnd('\') + '\'
$types = @{
  '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'
  '.css'  = 'text/css; charset=utf-8';  '.json' = 'application/json'
  '.png'  = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.avif' = 'image/avif'
  '.svg'  = 'image/svg+xml'; '.ico' = 'image/x-icon'; '.glb' = 'model/gltf-binary'
  '.mp3'  = 'audio/mpeg'; '.ogg' = 'audio/ogg'; '.wav' = 'audio/wav'
}

$serveur = New-Object System.Net.HttpListener
$serveur.Prefixes.Add("http://localhost:$Port/")
$serveur.Start()
Write-Host "EEMI Ball : http://localhost:$Port  (Ctrl+C pour arreter)"
Write-Host "Pour le telephone : cloudflared tunnel --url http://localhost:$Port --http-host-header localhost:$Port"

try {
  while ($serveur.IsListening) {
    $tache = $serveur.GetContextAsync()
    while (-not $tache.AsyncWaitHandle.WaitOne(300)) { }   # permet Ctrl+C
    $ctx = $tache.GetAwaiter().GetResult()
    $reponse = $ctx.Response
    $chemin = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
    if ($chemin.EndsWith('/')) { $chemin += 'index.html' }
    $fichier = [System.IO.Path]::GetFullPath((Join-Path $racine $chemin.TrimStart('/')))
    $reponse.Headers.Add('Cache-Control', 'no-store')
    try {
      if ($fichier.StartsWith($racineAvecSep, [System.StringComparison]::OrdinalIgnoreCase) -and (Test-Path -LiteralPath $fichier -PathType Leaf)) {
        $ext = [System.IO.Path]::GetExtension($fichier).ToLower()
        $reponse.ContentType = if ($types.ContainsKey($ext)) { $types[$ext] } else { 'application/octet-stream' }
        $octets = [System.IO.File]::ReadAllBytes($fichier)
        $reponse.ContentLength64 = $octets.Length
        $reponse.OutputStream.Write($octets, 0, $octets.Length)
        $code = 200
      } else {
        $reponse.StatusCode = 404
        $octets = [System.Text.Encoding]::UTF8.GetBytes('404 - introuvable')
        $reponse.OutputStream.Write($octets, 0, $octets.Length)
        $code = 404
      }
    } catch {
      $code = 500
    } finally {
      $reponse.Close()
    }
    Write-Host "$code $chemin"
  }
} finally {
  $serveur.Stop()
}
