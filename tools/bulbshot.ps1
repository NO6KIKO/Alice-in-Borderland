# Dev: run the ♦4 Light Bulb walk-through (?bulbshot, captures lb_*) or the rules check (-Test: ?bulbtest, results as
# capture names lbt_<step>_<ok|FAIL>_<detail>) in headless Chrome with software GL, so it never competes with a game
# tab for the iGPU. Captures land in .tmp/shots through the local server's /__shot. Needs the server up (tools/launch.ps1
# or the preview). Exits when the last capture appears or after $Timeout seconds.
param([int]$Port = 8765, [int]$Timeout = 600, [switch]$Test)
$root = Split-Path -Parent $PSScriptRoot
$shots = Join-Path $root '.tmp\shots'; New-Item -ItemType Directory -Force $shots | Out-Null
$pat = if ($Test) { 'lbt_*.jpg' } else { 'lb_*.jpg' }
Get-ChildItem $shots -Filter $pat -ErrorAction SilentlyContinue | Remove-Item -Force
$prof = Join-Path $root '.tmp\chrome-bulb'; New-Item -ItemType Directory -Force $prof | Out-Null
$chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
$q = if ($Test) { 'bulbtest' } else { 'bulbshot' }
$args = @('--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio', '--window-size=960,540', "--user-data-dir=$prof", "http://127.0.0.1:$Port/?$q&lite")
$p = Start-Process -FilePath $chrome -ArgumentList $args -PassThru
$t0 = Get-Date
$done = { if ($Test) { Get-ChildItem $shots -Filter 'lbt_99done*' -ErrorAction SilentlyContinue } else { Test-Path (Join-Path $shots 'lb_7_overview.jpg') } }
while (((Get-Date) - $t0).TotalSeconds -lt $Timeout -and -not (& $done)) { Start-Sleep -Seconds 3 }
Start-Sleep -Seconds 2
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -like "*chrome-bulb*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Get-ChildItem $shots -Filter $pat | Sort-Object LastWriteTime | Select-Object Name, LastWriteTime | Format-Table -AutoSize | Out-String
"elapsed {0:N0} s" -f ((Get-Date) - $t0).TotalSeconds
