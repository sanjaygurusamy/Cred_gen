#!/usr/bin/env python3
"""
CampusCarbon AI — Platform Orchestrator & Launcher
Organization: Amrita Vishwa Vidyapeetham | Coimbatore Campus

This script provides a one-command, autonomous startup for the entire platform:
1. Verifies/starts Docker Desktop & the PostgreSQL 16 container.
2. Validates database connectivity and runs Alembic migrations.
3. Frees or manages ports 8000 (Backend) and 5173 (Frontend).
4. Spawns the FastAPI backend and Vite frontend concurrently.
5. Performs real-time health checks on all service endpoints.
6. Automatically opens the web application in the default browser.
7. Handles graceful shutdown on Ctrl+C, killing child process trees cleanly.
"""

import os
import sys
import time
import socket
import signal
import argparse
import subprocess
import threading
import webbrowser
import urllib.request
import urllib.error
from pathlib import Path

# Safe Unicode / ASCII terminal output configuration
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

# Enable VT100 ANSI escape sequences on Windows
if sys.platform == "win32":
    os.system("")

# Styling constants
GREEN = "\033[92m"
CYAN = "\033[96m"
YELLOW = "\033[93m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def log(tag: str, msg: str, color: str = CYAN):
    ts = time.strftime("%H:%M:%S")
    print(f"{DIM}{ts}{RESET} {color}[{tag}]{RESET} {msg}", flush=True)

def log_ok(msg: str):
    log("OK", msg, GREEN)

def log_info(msg: str):
    log("INFO", msg, CYAN)

def log_warn(msg: str):
    log("WARN", msg, YELLOW)

def log_err(msg: str):
    log("ERROR", msg, RED)

def print_banner():
    banner = f"""{BOLD}{CYAN}
======================================================================
     CampusCarbon AI — Sustainability & Carbon Accounting Platform
        Amrita Vishwa Vidyapeetham — Coimbatore Campus (AVV-CBE)
======================================================================{RESET}"""
    print(banner, flush=True)

# ---------------------------------------------------------------------------
# Process & Port Utilities
# ---------------------------------------------------------------------------

def is_port_open(port: int, host: str = "127.0.0.1", timeout: float = 0.5) -> bool:
    """Checks whether a TCP port is currently open and accepting connections."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0

def get_pids_on_port(port: int) -> set:
    """Returns set of PIDs listening on the given port (Windows & Unix)."""
    pids = set()
    if sys.platform == "win32":
        try:
            out = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True, text=True, errors="replace")
            for line in out.strip().splitlines():
                parts = line.split()
                if len(parts) >= 5 and "LISTENING" in line and parts[1].endswith(f":{port}"):
                    try:
                        pids.add(int(parts[-1]))
                    except ValueError:
                        pass
        except Exception:
            pass
    else:
        try:
            out = subprocess.check_output(["lsof", "-t", f"-i:{port}"], text=True, errors="replace")
            for line in out.strip().splitlines():
                try:
                    pids.add(int(line))
                except ValueError:
                    pass
        except Exception:
            pass
    return pids

def kill_process_tree(pid: int):
    """Forcefully terminates a process and all its child processes."""
    if pid <= 0:
        return
    try:
        if sys.platform == "win32":
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            import signal
            os.killpg(os.getpgid(pid), signal.SIGTERM)
    except Exception:
        pass

def free_port(port: int, service_name: str):
    """Terminates any process currently listening on the specified port."""
    pids = get_pids_on_port(port)
    if pids:
        log_warn(f"Port {port} ({service_name}) is occupied by PID(s): {', '.join(map(str, pids))}. Terminating...")
        for p in pids:
            kill_process_tree(p)
        time.sleep(1)
        if is_port_open(port):
            log_warn(f"Port {port} still appears open. Retrying termination...")
            for p in get_pids_on_port(port):
                kill_process_tree(p)
            time.sleep(1)

# ---------------------------------------------------------------------------
# Docker & Database Management
# ---------------------------------------------------------------------------

def is_docker_running() -> bool:
    try:
        res = subprocess.run(["docker", "info"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return res.returncode == 0
    except Exception:
        return False

def ensure_docker():
    """Verifies Docker daemon; starts Docker Desktop on Windows if needed."""
    if is_docker_running():
        log_ok("Docker daemon is active.")
        return True

    log_warn("Docker daemon is not responding. Attempting to start Docker Desktop...")
    if sys.platform == "win32":
        docker_desktop_path = Path("C:/Program Files/Docker/Docker/Docker Desktop.exe")
        backend_helper = Path("C:/Program Files/Docker/Docker/resources/com.docker.backend.exe")
        
        if docker_desktop_path.exists():
            subprocess.Popen([str(docker_desktop_path)], shell=True)
            if backend_helper.exists():
                subprocess.Popen([str(backend_helper), "--help"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            
            # Poll for daemon up to 45 seconds
            log_info("Waiting for Docker Desktop engine to initialize (up to 45s)...")
            for i in range(45):
                time.sleep(1)
                if is_docker_running():
                    log_ok(f"Docker daemon initialized in {i+1}s.")
                    return True
                if (i + 1) % 10 == 0:
                    log_info(f"Still waiting for Docker engine ({i+1}s)...")
    
    log_err("Could not automatically connect to Docker daemon.")
    log_info("Please start Docker Desktop manually, or start an external PostgreSQL instance on port 5432.")
    return False

def ensure_postgres(skip_docker: bool = False):
    """Starts PostgreSQL container and verifies database connection."""
    if not skip_docker and is_docker_running():
        log_info("Starting PostgreSQL 16 container via docker-compose...")
        try:
            subprocess.run(["docker", "compose", "up", "-d", "postgres"], cwd=ROOT_DIR, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception:
            try:
                subprocess.run(["docker", "start", "campuscarbon_postgres"], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            except Exception as e:
                log_warn(f"Docker compose / start returned: {e}")

    # Wait for PostgreSQL on port 5432
    log_info("Waiting for PostgreSQL connection on port 5432...")
    for _ in range(30):
        if is_port_open(5432):
            # Test actual DB query using Python
            try:
                sys_path_saved = list(sys.path)
                if str(BACKEND_DIR) not in sys.path:
                    sys.path.insert(0, str(BACKEND_DIR))
                from app.core.database import check_database_health
                is_conn, eng_type, msg = check_database_health()
                sys.path = sys_path_saved
                if is_conn:
                    log_ok(f"PostgreSQL database ready ({eng_type}: {msg})")
                    return True
            except Exception:
                time.sleep(1)
        else:
            time.sleep(1)

    log_warn("PostgreSQL connection check timed out. Proceeding anyway (backend will retry on startup)...")
    return False

def run_migrations():
    """Runs Alembic migrations to ensure the database schema is up-to-date."""
    log_info("Checking and applying database migrations (Alembic)...")
    try:
        res = subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND_DIR, capture_output=True, text=True, errors="replace")
        if res.returncode == 0:
            log_ok("Database migrations synchronized to head.")
        else:
            log_warn(f"Alembic migration notice: {res.stderr.strip() or res.stdout.strip()}")
    except Exception as e:
        log_warn(f"Could not run alembic migrations: {e}")

# ---------------------------------------------------------------------------
# Service Runners & Log Streaming
# ---------------------------------------------------------------------------

class ServiceRunner:
    def __init__(self, name: str, cmd: list, cwd: Path, color: str):
        self.name = name
        self.cmd = cmd
        self.cwd = cwd
        self.color = color
        self.process = None
        self.thread = None

    def start(self):
        log_info(f"Starting {self.name}...", self.color)
        self.process = subprocess.Popen(
            self.cmd,
            cwd=str(self.cwd),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            errors="replace"
        )
        self.thread = threading.Thread(target=self._stream_logs, daemon=True)
        self.thread.start()

    def _stream_logs(self):
        prefix = f"{self.color}[{self.name}]{RESET}"
        try:
            for line in iter(self.process.stdout.readline, ""):
                line_clean = line.rstrip()
                if line_clean:
                    # Filter out excessively verbose Vite HMR or health check noise if needed
                    print(f"{prefix} {line_clean}", flush=True)
        except Exception:
            pass

    def stop(self):
        if self.process and self.process.poll() is None:
            log_info(f"Stopping {self.name} (PID: {self.process.pid})...", self.color)
            kill_process_tree(self.process.pid)

# ---------------------------------------------------------------------------
# Health Verification & Browser Opening
# ---------------------------------------------------------------------------

def check_http_endpoint(url: str, timeout: float = 2.0) -> bool:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "CampusCarbon-HealthCheck"})
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.status in (200, 304)
    except Exception:
        return False

def wait_for_services(timeout_sec: int = 30) -> bool:
    backend_url = "http://127.0.0.1:8000/api/health"
    frontend_url = "http://127.0.0.1:5173/"
    
    log_info("Waiting for service readiness probes...")
    start_time = time.time()
    backend_ready = False
    frontend_ready = False

    while time.time() - start_time < timeout_sec:
        if not backend_ready and check_http_endpoint(backend_url):
            backend_ready = True
            log_ok("Backend API is ready (http://localhost:8000)")

        if not frontend_ready and check_http_endpoint(frontend_url):
            frontend_ready = True
            log_ok("Frontend Web UI is ready (http://localhost:5173)")

        if backend_ready and frontend_ready:
            return True

        time.sleep(0.5)

    return backend_ready and frontend_ready

def print_ready_card():
    card = f"""
{BOLD}{GREEN}======================================================================
     Platform Services are LIVE and Fully Operational!
======================================================================{RESET}
  {BOLD}Frontend UI:{RESET}     {CYAN}http://localhost:5173{RESET}
  {BOLD}Backend API:{RESET}     {CYAN}http://localhost:8000{RESET}
  {BOLD}API Docs:{RESET}        {CYAN}http://localhost:8000/docs{RESET}
  {BOLD}Database:{RESET}        PostgreSQL 16 on port 5432 (campuscarbon_postgres)
  {BOLD}Campus:{RESET}          Amrita Vishwa Vidyapeetham, Coimbatore Campus
----------------------------------------------------------------------
  {YELLOW}Press [Ctrl+C] at any time to gracefully shut down all services.{RESET}
======================================================================
"""
    print(card, flush=True)

# ---------------------------------------------------------------------------
# CLI Commands: Stop & Status
# ---------------------------------------------------------------------------

def stop_platform(stop_docker: bool = False):
    print_banner()
    log_info("Stopping CampusCarbon AI services...")
    free_port(8000, "Backend API")
    free_port(5173, "Frontend UI")
    
    if stop_docker and is_docker_running():
        log_info("Stopping PostgreSQL Docker container...")
        subprocess.run(["docker", "compose", "stop", "postgres"], cwd=ROOT_DIR, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        log_ok("PostgreSQL container stopped.")

    log_ok("All platform services have been stopped successfully.")

def check_status():
    print_banner()
    log_info("Inspecting CampusCarbon AI component status:")
    
    docker_up = is_docker_running()
    print(f"  * Docker Daemon:      {'[' + GREEN + 'UP' + RESET + ']' if docker_up else '[' + RED + 'DOWN' + RESET + ']'}")
    
    pg_up = is_port_open(5432)
    print(f"  * PostgreSQL (5432):  {'[' + GREEN + 'LISTENING' + RESET + ']' if pg_up else '[' + RED + 'NOT REACHABLE' + RESET + ']'}")

    backend_up = check_http_endpoint("http://127.0.0.1:8000/api/health")
    print(f"  * Backend (8000):     {'[' + GREEN + 'HEALTHY (200 OK)' + RESET + ']' if backend_up else '[' + RED + 'OFFLINE' + RESET + ']'}")

    frontend_up = check_http_endpoint("http://127.0.0.1:5173/")
    print(f"  * Frontend (5173):    {'[' + GREEN + 'HEALTHY (200 OK)' + RESET + ']' if frontend_up else '[' + RED + 'OFFLINE' + RESET + ']'}")

# ---------------------------------------------------------------------------
# Main Orchestration Flow
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="CampusCarbon AI Platform Orchestrator")
    parser.add_argument("-r", "--restart", action="store_true", help="Force restart any running services on ports 8000/5173")
    parser.add_argument("--stop", action="store_true", help="Stop all running services and exit")
    parser.add_argument("--stop-all", action="store_true", help="Stop all running services including Docker container and exit")
    parser.add_argument("--status", action="store_true", help="Display health status of all platform components and exit")
    parser.add_argument("--no-browser", action="store_true", help="Do not automatically launch web browser")
    parser.add_argument("--no-docker", action="store_true", help="Skip Docker checks and container startup")
    args = parser.parse_args()

    if args.stop:
        stop_platform(stop_docker=False)
        return

    if args.stop_all:
        stop_platform(stop_docker=True)
        return

    if args.status:
        check_status()
        return

    print_banner()

    # Step 1: Docker & PostgreSQL verification
    if not args.no_docker:
        ensure_docker()
    ensure_postgres(skip_docker=args.no_docker)

    # Step 2: Alembic Migrations
    run_migrations()

    # Step 3: Port checks & cleanup
    if args.restart:
        log_info("Restart flag active: cleaning up ports 8000 and 5173...")
        free_port(8000, "Backend API")
        free_port(5173, "Frontend UI")
    else:
        # Check if already running
        b_up = check_http_endpoint("http://127.0.0.1:8000/api/health")
        f_up = check_http_endpoint("http://127.0.0.1:5173/")
        if b_up and f_up:
            log_ok("Backend (port 8000) and Frontend (port 5173) are ALREADY running!")
            print_ready_card()
            if not args.no_browser:
                log_info("Opening browser to http://localhost:5173...")
                webbrowser.open("http://localhost:5173")
            log_info("Platform is running. Press [Ctrl+C] to exit launcher or use --restart to restart services.")
            try:
                while True:
                    time.sleep(1)
            except KeyboardInterrupt:
                log_info("Exiting launcher.")
            return
        else:
            # Clean up ports if partially bound
            if is_port_open(8000) and not b_up:
                free_port(8000, "Backend API")
            if is_port_open(5173) and not f_up:
                free_port(5173, "Frontend UI")

    # Step 4: Configure commands
    npm_bin = "npm.cmd" if sys.platform == "win32" else "npm"

    backend_cmd = [sys.executable, "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    frontend_cmd = [npm_bin, "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]

    backend_svc = ServiceRunner("BACKEND", backend_cmd, BACKEND_DIR, CYAN)
    frontend_svc = ServiceRunner("FRONTEND", frontend_cmd, FRONTEND_DIR, "\033[95m")

    # Step 5: Start services
    backend_svc.start()
    frontend_svc.start()

    # Step 6: Health verification & browser opening
    ready = wait_for_services(timeout_sec=35)
    if ready:
        print_ready_card()
        if not args.no_browser:
            time.sleep(0.5)
            log_info("Opening default browser to http://localhost:5173...")
            webbrowser.open("http://localhost:5173")
    else:
        log_warn("One or more services did not respond to health checks within the timeout.")
        log_info("Review the service logs above for diagnostic details.")

    # Step 7: Keep alive and graceful shutdown handler
    def shutdown_handler(signum=None, frame=None):
        print()
        log_info("Received shutdown signal. Stopping services cleanly...")
        backend_svc.stop()
        frontend_svc.stop()
        free_port(8000, "Backend API")
        free_port(5173, "Frontend UI")
        log_ok("CampusCarbon AI shut down cleanly.")
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        shutdown_handler()

if __name__ == "__main__":
    main()
