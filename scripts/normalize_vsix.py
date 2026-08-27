#!/usr/bin/env python3
"""Normalize a VSIX into deterministic ZIP bytes without changing its payload."""

from __future__ import annotations

import argparse
from hashlib import sha256
from pathlib import Path, PurePosixPath
import tempfile
import zipfile


FIXED_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


def normalize(path: Path) -> tuple[int, str]:
    path = path.expanduser().resolve(strict=True)
    if not path.is_file() or path.is_symlink() or path.suffix.casefold() != ".vsix":
        raise ValueError("The VSIX normalization input is not a safe regular .vsix file.")

    with zipfile.ZipFile(path, "r") as source:
        infos = source.infolist()
        names = [info.filename for info in infos]
        if len(names) != len(set(names)):
            raise ValueError("The VSIX contains duplicate entry names.")
        for name in names:
            pure = PurePosixPath(name)
            if pure.is_absolute() or ".." in pure.parts or "\\" in name:
                raise ValueError("The VSIX contains an unsafe entry path.")
        payloads = {info.filename: source.read(info) for info in infos if not info.is_dir()}

    temporary: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=f".{path.name}-", delete=False) as handle:
            temporary = Path(handle.name)
        with zipfile.ZipFile(
            temporary,
            "w",
            compression=zipfile.ZIP_DEFLATED,
            compresslevel=9,
            strict_timestamps=True,
        ) as target:
            for name in sorted(names):
                source_info = next(info for info in infos if info.filename == name)
                is_directory = source_info.is_dir()
                normalized = zipfile.ZipInfo(name, FIXED_TIMESTAMP)
                normalized.create_system = 3
                normalized.compress_type = zipfile.ZIP_DEFLATED
                normalized.external_attr = ((0o40755 if is_directory else 0o100644) << 16)
                normalized.flag_bits = 0x800
                target.writestr(normalized, b"" if is_directory else payloads[name], compresslevel=9)
        temporary.chmod(0o644)
        temporary.replace(path)
        temporary = None
    finally:
        if temporary is not None and temporary.exists():
            temporary.unlink()

    return len(names), sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("vsix", type=Path)
    args = parser.parse_args()
    count, digest = normalize(args.vsix)
    print(f"Deterministic VSIX normalization passed: entries={count} sha256={digest}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
