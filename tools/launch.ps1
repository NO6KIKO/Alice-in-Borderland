# One-click start for the city (the desktop shortcut runs this): starts tools/serve.py on 127.0.0.1:8765 unless it is
# already up, waits until it answers, then opens the game in the default browser. The server runs in a minimised
# console window titled "Borderland server" — close that window to stop it.
#   powershell -ExecutionPolicy Bypass -File tools\launch.ps1 [-NoBrowser]
param([switch]$NoBrowser)
$root = Split-Path -Parent $PSScriptRoot
$port = 8765
function Up { try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $port); $c.Close(); $true } catch { $false } }
if (-not (Up)) {
  $py = (Get-Command python.exe -ErrorAction SilentlyContinue | Where-Object { $_.Source -notlike '*WindowsApps*' } | Select-Object -First 1).Source
  if (-not $py) { Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Python was not found on PATH.', 'Borderland'); exit 1 }
  $cmd = "title Borderland server && `"$py`" `"$root\tools\serve.py`" $port `"$root`" 127.0.0.1"
  Start-Process -FilePath cmd.exe -ArgumentList '/c', $cmd -WorkingDirectory $root -WindowStyle Minimized
  for ($i = 0; $i -lt 75 -and -not (Up); $i++) { Start-Sleep -Milliseconds 200 }
}
if (-not $NoBrowser) { Start-Process "http://127.0.0.1:$port/" }
