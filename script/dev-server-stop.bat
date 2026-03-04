@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=5000"

set "PID_FILE=%TEMP%\notenest-vite.pid"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$portArg = [int]'%PORT%'; $pidFile = '%PID_FILE%'; $killed = New-Object System.Collections.Generic.HashSet[int];" ^
  "if (Test-Path $pidFile) {" ^
  "  $savedPid = (Get-Content $pidFile -ErrorAction SilentlyContinue | Select-Object -First 1).Trim();" ^
  "  if ($savedPid -and (Get-Process -Id $savedPid -ErrorAction SilentlyContinue)) {" ^
  "    Stop-Process -Id $savedPid -Force -ErrorAction SilentlyContinue | Out-Null;" ^
  "    [void]$killed.Add([int]$savedPid);" ^
  "  }" ^
  "}" ^
  "$listeners = Get-NetTCPConnection -State Listen -LocalPort $portArg -ErrorAction SilentlyContinue;" ^
  "if ($listeners) {" ^
  "  $listeners | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object {" ^
  "    Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue | Out-Null;" ^
  "    [void]$killed.Add([int]$_);" ^
  "  }" ^
  "}" ^
  "Remove-Item -Path $pidFile -Force -ErrorAction SilentlyContinue;" ^
  "if ($killed.Count -eq 0) { Write-Output 'No running Vite dev server process found.' } else { Write-Output ('Stopped ' + $killed.Count + ' Vite dev server process(es).') }"

powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 3"

endlocal
