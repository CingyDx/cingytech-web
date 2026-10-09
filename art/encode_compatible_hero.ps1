# Precompose the existing Blender VP9-alpha loop for broad H.264 playback.
# Requires FFmpeg with libvpx-vp9 and libx264; run from any working directory.
$ErrorActionPreference = 'Stop'
$assetDir = Join-Path (Split-Path $PSScriptRoot -Parent) 'public/assets'
$sourceVideo = Join-Path $assetDir 'hero-glass-loop-1080.webm'
foreach ($variant in @(@{Width=960; Height=540; Crf=22}, @{Width=1440; Height=810; Crf=21}, @{Width=1920; Height=1080; Crf=21})) {
    $width = $variant.Width
    $height = $variant.Height
    $outputVideo = Join-Path $assetDir "hero-glass-motion-$width.mp4"
    & ffmpeg -hide_banner -loglevel error -y -c:v libvpx-vp9 -i $sourceVideo -f lavfi -i "color=c=0x090a10:s=${width}x${height}:r=24:d=5" -filter_complex "[0:v]scale=${width}:${height},format=rgba[fg];[1:v][fg]overlay=shortest=1:format=auto,format=yuv420p[out]" -map '[out]' -an -c:v libx264 -preset slow -crf $variant.Crf -movflags +faststart -shortest $outputVideo
    if ($LASTEXITCODE -ne 0) { throw "Encoding failed: $outputVideo" }
}
