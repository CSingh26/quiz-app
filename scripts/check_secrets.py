"""Conservative tracked-file secret pattern check; never echo matching secret text."""
import re
import subprocess
from pathlib import Path

patterns = [r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
            r'gh[pousr]_[A-Za-z0-9]{30,}', r'AKIA[0-9A-Z]{16}',
            r'sk-(?:proj-)?[A-Za-z0-9_-]{35,}']
files = subprocess.check_output(['git', 'ls-files', '-z']).decode().split('\0')
failed = []
for name in filter(None, files):
    path = Path(name)
    if path.suffix.lower() in {'.png', '.jpg', '.pdf', '.woff2'}:
        continue
    body = path.read_text(errors='replace')
    if any(re.search(pattern, body) for pattern in patterns):
        failed.append(name)
if failed:
    raise SystemExit('Potential secret in tracked files: ' + ', '.join(failed))
print('Tracked text scan passed; heuristic patterns are not an exhaustive security audit.')
