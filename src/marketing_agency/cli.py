"""CLI: arbitrary model inputs in, unchanged API responses out."""

import argparse
import json
import sys
from pathlib import Path

from .higgsfield import Higgsfield


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    submit = sub.add_parser("submit")
    submit.add_argument("--model", help="API endpoint ID; defaults to HIGGSFIELD_MODEL")
    submit.add_argument("--input", required=True, help="JSON file, or - for stdin")
    submit.add_argument("--webhook-url")
    submit.add_argument("--idempotency-key", help="Reuse with identical inputs after an ambiguous submission failure")
    for name in ("status", "result", "wait", "cancel"):
        p = sub.add_parser(name)
        p.add_argument("request_id")
        if name == "wait":
            p.add_argument("--timeout", type=float, default=600)
            p.add_argument("--poll-interval", type=float, default=2)
    sub.add_parser("upload").add_argument("path")
    args = parser.parse_args()
    try:
        with Higgsfield() as api:
            if args.command == "submit":
                data = sys.stdin.read() if args.input == "-" else Path(args.input).read_text()
                result = {"request_id": api.submit(json.loads(data), model=args.model,
                                                  webhook_url=args.webhook_url,
                                                  idempotency_key=args.idempotency_key)}
            elif args.command == "upload":
                result = {"url": api.upload(args.path)}
            elif args.command == "wait":
                result = api.wait(args.request_id, timeout=args.timeout, poll_interval=args.poll_interval)
            else:
                result = getattr(api, args.command)(args.request_id)
                if args.command == "status":
                    result = {"status": result}
                elif args.command == "cancel":
                    result = {"cancel_requested": True}
            print(json.dumps(result, indent=2))
            return 0
    except Exception:
        # SDK/network errors can include echoed payloads or credentials.
        # Keep CLI diagnostics safe; Python callers receive typed exceptions.
        print("Operation failed. Check credentials, model inputs, request status, and network access. "
              "After a submit failure, check the Higgsfield dashboard before retrying.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
