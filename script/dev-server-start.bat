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
  "$startMutex = New-Object System.Threading.Mutex($false, 'Global\NoteNestViteStartLock');" ^
  "if (-not $startMutex.WaitOne(15000)) {" ^
  "  Write-Output 'Another dev-server start is already in progress. Try again in a moment.';" ^
  "  exit 0;" ^
  "}" ^
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
  "    Write-Output ('Vite dev server already running (pid: ' + $existingPid + ') - ignoring request.');" ^
  "    Write-Output ('IP: ' + $hostArg);" ^
  "    Write-Output ('Port: ' + $portArg);" ^
  "    Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/');" ^
  "    exit 0;" ^
  "  }" ^
  "}" ^
  "$selfPid = $PID;" ^
  "$existingProc = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {" ^
  "  $_.ProcessId -ne $selfPid -and" ^
  "  ($_.Name -match '^(node|npm|cmd)\.exe$') -and" ^
  "  $_.CommandLine -and" ^
  "  $_.CommandLine -like ('*' + $projectRoot + '*') -and" ^
  "  ($_.CommandLine -match 'vite(\.cmd)?\s+dev' -or $_.CommandLine -match 'npm(\.cmd)?\s+run\s+dev')" ^
  "} | Select-Object -First 1;" ^
  "if ($existingProc) {" ^
  "  Write-Output ('Vite dev server already running (pid: ' + $existingProc.ProcessId + ') - ignoring request.');" ^
  "  Write-Output ('IP: ' + $hostArg);" ^
  "  Write-Output ('Port: ' + $portArg);" ^
  "  Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/');" ^
  "  exit 0;" ^
  "}" ^
  "$listener = Get-NetTCPConnection -State Listen -LocalPort $portArg -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "if ($listener) {" ^
  "  Write-Output ('Vite dev server appears to already be running on port ' + $portArg + ' (pid: ' + $listener.OwningProcess + ') - ignoring request.');" ^
  "  Write-Output ('IP: ' + $hostArg);" ^
  "  Write-Output ('Port: ' + $portArg);" ^
  "  Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/');" ^
  "  exit 0;" ^
  "}" ^
  "$cmd = '/c npm run dev -- --host ' + $hostArg + ' --port ' + $portArg + ' > \"' + $logFile + '\" 2>&1';" ^
  "$p = Start-Process -FilePath 'cmd.exe' -ArgumentList $cmd -WorkingDirectory $projectRoot -WindowStyle Hidden -PassThru;" ^
  "$isUp = $false;" ^
  "$serverPid = $null;" ^
  "for ($i = 0; $i -lt 40; $i++) {" ^
  "  Start-Sleep -Milliseconds 250;" ^
  "  if (-not (Get-Process -Id $p.Id -ErrorAction SilentlyContinue)) { break }" ^
  "  $up = Get-NetTCPConnection -State Listen -LocalPort $portArg -ErrorAction SilentlyContinue | Select-Object -First 1;" ^
  "  if ($up) { $isUp = $true; $serverPid = $up.OwningProcess; break }" ^
  "}" ^
  "if (-not $isUp) {" ^
  "  Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue | Out-Null;" ^
  "  Write-Output 'Failed to start Vite dev server.';" ^
  "  Write-Output ('Log: ' + $logFile);" ^
  "  if (Test-Path $logFile) { Get-Content -Path $logFile -Tail 20 }" ^
  "  Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "  exit 1;" ^
  "}" ^
  "if (-not $serverPid) { $serverPid = $p.Id }" ^
  "Set-Content -Path $pidFile -Value $serverPid;" ^
  "Write-Output ('Started Vite dev server (pid: ' + $serverPid + ').');" ^
  "Write-Output ('IP: ' + $hostArg);" ^
  "Write-Output ('Port: ' + $portArg);" ^
  "Write-Output ('URL: http://' + $hostArg + ':' + $portArg + '/'); Write-Output ('Log: ' + $logFile);" ^
  "$startMutex.ReleaseMutex() | Out-Null;"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3"

endlocal
