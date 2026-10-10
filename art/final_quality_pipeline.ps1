# One authorized local render pipeline; no scheduler, deploy or purchase.
$ErrorActionPreference='Stop'
$taskProject=Split-Path $PSScriptRoot -Parent
$taskPython='C:/Users/kryst/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
$taskMetadata=Join-Path $taskProject 'render/crystal/final4k/metadata.json'
while(-not(Test-Path -LiteralPath $taskMetadata)){
    $taskRenderer=Get-CimInstance Win32_Process -Filter "Name='blender.exe'" |Where-Object {$_.CommandLine -like '*--output render/crystal/final4k'}
    if(-not $taskRenderer){throw '4K renderer stopped before completing its source metadata.'}
    Start-Sleep -Seconds 30
}
$taskSource=Get-Content -LiteralPath $taskMetadata -Raw|ConvertFrom-Json
if($taskSource.frames -ne 1920 -or $taskSource.width -ne 3840 -or $taskSource.height -ne 2160 -or $taskSource.fps -ne 60){throw 'Source resolution/frame count differs from approved final render.'}
Push-Location $taskProject
try{
    & $taskPython art/encode_final_quality.py
    if($LASTEXITCODE -ne 0){throw 'Final source verification or encoding failed.'}
    & $taskPython art/integrate_motion_study.py --variant continuous-polish --moving-background --rich-background --final-quality
    if($LASTEXITCODE -ne 0){throw 'Final local integration failed.'}
    'Final files integrated locally; browser QA and authorized Opera refresh remain.' |Set-Content 'render/crystal/final-quality/LOCAL-INTEGRATION-READY.txt'
}finally{Pop-Location}
