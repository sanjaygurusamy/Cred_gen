<#
.SYNOPSIS
    CampusCarbon AI — PowerShell Platform Launcher
.DESCRIPTION
    Starts the full stack: Docker, PostgreSQL, FastAPI backend, and Vite frontend.
.EXAMPLE
    .\start.ps1
    .\start.ps1 -Restart
    .\start.ps1 -Status
    .\start.ps1 -NoBrowser
#>
[CmdletBinding()]
param(
    [switch]$Restart,
    [switch]$NoBrowser,
    [switch]$NoDocker,
    [switch]$Stop,
    [switch]$StopAll,
    [switch]$Status
)

$argsList = @()
if ($Restart) { $argsList += "--restart" }
if ($NoBrowser) { $argsList += "--no-browser" }
if ($NoDocker) { $argsList += "--no-docker" }
if ($Stop) { $argsList += "--stop" }
if ($StopAll) { $argsList += "--stop-all" }
if ($Status) { $argsList += "--status" }

python run.py @argsList
