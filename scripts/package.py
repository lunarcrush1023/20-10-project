"""Package a portable Windows release, with verified official Node runtime."""
from pathlib import Path
import hashlib, zipfile, shutil, sys
root = Path(__file__).resolve().parent.parent
out = Path(sys.argv[1]) if len(sys.argv)>1 else root/'work/release'
out.mkdir(parents=True, exist_ok=True)
expected = next(line.split()[0] for line in (root/'work/SHASUMS256.txt').read_text().splitlines() if line.split()[-1] == 'win-x64/node.exe')
assert hashlib.sha256((root/'work/node.exe').read_bytes()).hexdigest() == expected, 'Node checksum mismatch'
name = '20-10-Minigame-Studio-Windows.zip'
with zipfile.ZipFile(out/name,'w',zipfile.ZIP_DEFLATED) as z:
    for f in ['KHOI-DONG.cmd','README.md','KIEM-THU.md','server.mjs','game.mjs','package.json']:
        z.write(root/f,'20-10-Minigame-Studio/'+f)
    for f in (root/'public').glob('*'):
        z.write(f,'20-10-Minigame-Studio/public/'+f.name)
    z.write(root/'work/node.exe','20-10-Minigame-Studio/runtime/node.exe')
    z.write(root/'work/node-LICENSE','20-10-Minigame-Studio/runtime/LICENSE')
    z.writestr('20-10-Minigame-Studio/runtime/NGUON.txt', f'Node.js v24.14.0 Windows x64\nhttps://nodejs.org/dist/v24.14.0/win-x64/node.exe\nSHA-256: {expected}\n')
shutil.copy(root/'README.md',out/'HUONG-DAN.md')
print(f'{out/name}: {(out/name).stat().st_size:,} bytes; runtime checksum verified')
