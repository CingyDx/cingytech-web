# Bound the web bandwidth separately from the genuine 4K/60 master.
# Temporal denoising removes sampling noise, without inventing motion frames.
$ErrorActionPreference='Stop'
$studioRoot=Split-Path $PSScriptRoot -Parent
$assetDirectory=Join-Path $studioRoot 'public/assets'
$renderDirectory=Join-Path $studioRoot 'render/crystal'
foreach($variant in @(@{Width=768;Crf=23;Rate='2M';Buffer='4M'},@{Width=1080;Crf=24;Rate='5M';Buffer='10M'},@{Width=1440;Crf=24;Rate='7M';Buffer='14M'})){
    $width=$variant.Width
    $rawVideo=Join-Path $renderDirectory "crystal-loop-$width-raw.mp4"
    $webVideo=Join-Path $assetDirectory "crystal-loop-$width.mp4"
    if(-not (Test-Path -LiteralPath $rawVideo)){throw "Missing fresh encoder output: $rawVideo. Run art/encode_crystal_studio.py first."}
    & ffmpeg -hide_banner -loglevel error -y -i $rawVideo -vf 'hqdn3d=1.1:1.1:2.2:2.2' -an -c:v libx264 -preset slow -crf $variant.Crf -maxrate $variant.Rate -bufsize $variant.Buffer -pix_fmt yuv420p -color_primaries bt709 -color_trc bt709 -colorspace bt709 -color_range tv -movflags +faststart $webVideo
    if($LASTEXITCODE -ne 0){throw "Web compression failed: $width"}
}
