# Encode the 4K Cycles frame sequence into browser-sized, looping assets.
$ErrorActionPreference = 'Stop'
$project = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$frameDir = Join-Path $project 'render/frames4k'
$assets = Join-Path $project 'public/assets'
$frames = Get-ChildItem -LiteralPath $frameDir -Filter 'glass_*.png'
if ($frames.Count -ne 120) { throw "Expected 120 rendered frames, found $($frames.Count)." }
$inputPattern = Join-Path $frameDir 'glass_%04d.png'

function Encode-Video($name, $filter, $codecArgs) {
    $output = Join-Path $assets $name
    & ffmpeg -y -hide_banner -loglevel error -framerate 24 -start_number 1 -i $inputPattern -frames:v 120 -vf $filter @codecArgs $output
    if ($LASTEXITCODE -ne 0) { throw "ffmpeg failed: $name" }
    Write-Host "$name : $([math]::Round((Get-Item -LiteralPath $output).Length / 1MB, 2)) MiB"
}

$vp9 = @('-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1', '-auto-alt-ref', '0')
Encode-Video 'hero-glass-loop-720.webm' 'scale=1280:720:flags=lanczos,format=yuva420p' ($vp9 + @('-crf', '33'))
Encode-Video 'hero-glass-loop-1080.webm' 'scale=1920:1080:flags=lanczos,format=yuva420p' ($vp9 + @('-crf', '35'))
Encode-Video 'hero-glass-loop-4k.webm' 'format=yuva420p' ($vp9 + @('-crf', '38'))
