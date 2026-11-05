"""CIVITAS dedicated worker entrypoint."""
from . import main
from .job_queue import main as run_worker

if __name__ == "__main__":
    run_worker()
