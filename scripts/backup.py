"""Consistent online SQLite backup plus persisted Identity encryption keys."""
import datetime
import os
import pathlib
import shutil
import sqlite3

source = pathlib.Path(os.environ.get("DATA_DIRECTORY", "/data"))
destination = pathlib.Path(os.environ.get("BACKUP_DIRECTORY", "/backups")) / datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
destination.mkdir(parents=True, mode=0o700)
with sqlite3.connect(f"file:{source / 'meals.db'}?mode=ro", uri=True) as database:
    with sqlite3.connect(destination / "meals.db") as backup:
        database.backup(backup)
        if backup.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise RuntimeError("Backup integrity check failed")
shutil.copytree(source / "keys", destination / "keys")
print(f"Backup ready: {destination}")
