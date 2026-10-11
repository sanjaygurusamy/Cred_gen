#!/usr/bin/env bash
# ====================================================================
# CampusCarbon AI — Linux/macOS/WSL Launcher
# ====================================================================

set -e

command -v python3 >/dev/null 2>&1 || {
    echo >&2 "[ERROR] Python 3 is required but not installed. Aborting."
    exit 1
}

command -v node >/dev/null 2>&1 || {
    echo >&2 "[ERROR] Node.js is required but not installed. Aborting."
    exit 1
}

python3 run.py "$@"
