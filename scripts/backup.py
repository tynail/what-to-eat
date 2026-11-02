"""Consistent online SQLite backup plus persisted Identity encryption keys."""
import datetime
import contextlib
import os
import pathlib
import shutil
import sqlite3

source = pathlib.Path(os.environ.get("DATA_DIRECTORY", "/data"))
destination = pathlib.Path(os.environ.get("BACKUP_DIRECTORY", "/backups")) / datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
destination.mkdir(parents=True, mode=0o700)
try:
    with contextlib.closing(sqlite3.connect(f"file:{source / 'meals.db'}?mode=ro", uri=True)) as database:
        with contextlib.closing(sqlite3.connect(destination / "meals.db")) as backup:
            database.backup(backup)
            if backup.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise RuntimeError("Backup integrity check failed")
    shutil.copytree(source / "keys", destination / "keys")
except BaseException:
    shutil.rmtree(destination)
    raise
print(f"Backup ready: {destination}")
