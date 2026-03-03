@echo off
setlocal

set "HOST=%~1"
if "%HOST%"=="" set "HOST=127.0.0.1"

set "PORT=%~2"
if "%PORT%"=="" set "PORT=5000"

set "PID_FILE=%TEMP%\notenest-vite.pid"
set "LOG_FILE=%TEMP%\notenest-vite.log"
set "PROJECT_ROOT=%~dp0.."

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$hostArg = '%HOST%'; $portArg = [int]'%PORT%'; $pidFile = '%PID_FILE%'; $logFile = '%LOG_FILE%'; $projectRoot = (Resolve-Path '%PROJECT_ROOT%').Path;" ^
  "if (-not (Test-Path (Join-Path $projectRoot 'package.json'))) {" ^
  "  Write-Output ('Cannot find package.json in project root: ' + $projectRoot);" ^
  "  exit 1;" ^
  "}" ^
  "if (-not (Test-Path (Join-Path $projectRoot 'node_modules\.bin\vite.cmd'))) {" ^
  "  Write-Output 'Missing local Vite binary at node_modules\\.bin\\vite.cmd';" ^
  "  Write-Output 'Run: npm install';" ^
  "  exit 1;" ^
  "}" ^
  "if (Test-Path $pidFile) {" ^
  "  $existingPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim();" ^
  "  if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {" ^
  "    Write-Output ('Vite dev server already running (pid: ' + $existingPid + ').');" ^
  "    Write-Output ('IP: ' + $hostArg);" ^
  "    Write-Output ('Port: ' + $portArg);" ^
  "    Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/');" ^
  "    exit 0;" ^
  "  }" ^
  "}" ^
  "$listener = Get-NetTCPConnection -State Listen -LocalPort $portArg -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "if ($listener) {" ^
  "  Write-Output ('Vite dev server appears to already be running on port ' + $portArg + ' (pid: ' + $listener.OwningProcess + ').');" ^
  "  Write-Output ('IP: ' + $hostArg);" ^
  "  Write-Output ('Port: ' + $portArg);" ^
  "  Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/');" ^
  "  exit 0;" ^
  "}" ^
  "$cmd = '/c npm run dev -- --host ' + $hostArg + ' --port ' + $portArg + ' > \"' + $logFile + '\" 2>&1';" ^
  "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList $cmd -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru;" ^
  "$isUp = $false;" ^
  "for ($i = 0; $i -lt 40; $i++) {" ^
  "  Start-Sleep -Milliseconds 250;" ^
  "  if (-not (Get-Process -Id $p.Id -ErrorAction SilentlyContinue)) { break }" ^
  "  $up = Get-NetTCPConnection -State Listen -LocalPort $portArg -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "  if ($up) { $isUp = $true; break }" ^
  "}" ^
  "if (-not $isUp) {" ^
  "  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue | Out-Null;" ^
  "  Write-Output 'Failed to start Vite dev server.';" ^
  "  Write-Output ('Log: ' + $logFile);" ^
  "  if (Test-Path $logFile) { Get-Content -Path $logFile -Tail 20 }" ^
  "  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "  exit 1;" ^
  "}" ^
  "Set-Content -Path $pidFile -Value $p.Id;" ^
  "Write-Output ('Started Vite dev server (pid: ' + $p.Id + ').');" ^
  "Write-Output ('IP: ' + $hostArg);" ^
  "Write-Output ('Port: ' + $portArg);" ^
  "Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/');" ^
  "Write-Output ('Log: ' + $logFile);"

endlocal
