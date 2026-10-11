<#
.SYNOPSIS
    CampusCarbon AI — PowerShell Stop Script
.DESCRIPTION
    Stops Backend, Frontend, and optionally PostgreSQL container.
.EXAMPLE
    .\stop.ps1
    .\stop.ps1 -All
#>
[CmdletBinding()]
param(
    [switch]$All
)

if ($All) {
    python run.py --stop-all
} else {
    python run.py --stop
}
