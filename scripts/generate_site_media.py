"""Generate L4G media only with Higgsfield Seedance 2.5, then optimize locally."""
import argparse
import hashlib
import json
import subprocess
import sys
import traceback
from pathlib import Path
from urllib.parse import urlparse

import httpx
from marketing_agency.higgsfield import Higgsfield

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--spec', default='assets/seedance/hero.json')
parser.add_argument('--output', default='web/public/media')
args = parser.parse_args()
spec = json.loads((ROOT / args.spec).read_text())
assert spec['model'] == 'bytedance/seedance-2.5/text-to-video'
output = ROOT / args.output
output.mkdir(parents=True, exist_ok=True)
def report_unhandled(error_type, error, tb):
    frames = traceback.extract_tb(tb)
    location = f'{Path(frames[-1].filename).name}:{frames[-1].lineno}' if frames else 'unknown'
    response = getattr(error, 'response', None)
    code = getattr(response, 'status_code', None)
    diagnostic = {'status': 'failed', 'error_type': error_type.__name__, 'location': location, 'http_status': code, 'model': spec['model']}
    (output / 'generation-status.json').write_text(json.dumps(diagnostic, indent=2) + '\n')
    print(f'::error title=Seedance media pipeline::{error_type.__name__} at {location}; HTTP status: {code}', flush=True)

sys.excepthook = report_unhandled
digest = hashlib.sha256(json.dumps(spec, sort_keys=True).encode()).hexdigest()[:24]
manifest = output / 'manifest.json'
if manifest.exists() and json.loads(manifest.read_text()).get('spec_hash') == digest:
    print('The requested Seedance assets already exist; no generation needed.')
    raise SystemExit(0)

with Higgsfield() as api:
    try:
        request_id = api.submit(spec['arguments'], model=spec['model'], idempotency_key=f'l4g-site-{digest}')
        print(f'Seedance request: {request_id}', flush=True)
        result = api.wait(request_id, timeout=1200, poll_interval=5)
    except Exception as error:
        # Do not echo response bodies, prompts with credentials, or auth headers.
        cause = error.__cause__
        response = getattr(cause, 'response', None)
        code = getattr(response, 'status_code', None)
        print(f'::error title=Seedance 2.5::Generation failed: {type(error).__name__}; HTTP status: {code or "not available"}', flush=True)
        (output / 'generation-status.json').write_text(json.dumps({'status': 'failed', 'error_type': type(error).__name__, 'http_status': code, 'model': spec['model']}, indent=2) + '\n')
        raise SystemExit(1)
print('Result top-level fields: ' + ', '.join(result.keys()), flush=True)
url = result['video']['url']
if urlparse(url).scheme != 'https':
    raise SystemExit('Expected an HTTPS media URL')
source = Path('/tmp/l4g-seedance-original.mp4')
with httpx.stream('GET', url, follow_redirects=True, timeout=120) as response:
    response.raise_for_status()
    with source.open('wb') as f:
        for chunk in response.iter_bytes():
            f.write(chunk)

def ffmpeg(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)

ffmpeg('-i', str(source), '-an', '-vf', 'scale=1280:-2,fps=24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-g', '6', '-keyint_min', '6', '-sc_threshold', '0', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(output / 'hero.mp4'))
for name, second, width in [('hero-poster.webp', 0, 1280), ('detail-ads.webp', 1.5, 960), ('detail-web.webp', 3.5, 960), ('detail-brand.webp', 6, 960), ('social.jpg', 0, 1200)]:
    ffmpeg('-ss', str(second), '-i', str(source), '-frames:v', '1', '-vf', f'scale={width}:-2', str(output / name))
manifest.write_text(json.dumps({'model': spec['model'], 'request_id': request_id, 'spec_hash': digest, 'duration': spec['arguments']['duration'], 'source': 'Higgsfield / Seedance 2.5', 'assets': ['hero.mp4', 'hero-poster.webp', 'detail-ads.webp', 'detail-web.webp', 'detail-brand.webp', 'social.jpg']}, indent=2) + '\n')
(output / 'generation-status.json').unlink(missing_ok=True)
print('Seedance media generated and optimized. No other generation model was used.')
