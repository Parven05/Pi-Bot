#!/usr/bin/env bash
set -euo pipefail

SECRETS_DIR="$(dirname "$0")/secrets"
ENV_FILE="$SECRETS_DIR/.env"
VARS_FILE="$SECRETS_DIR/.dev.vars"

usage() {
	echo "Usage: $0 <command>"
	echo ""
	echo "Commands:"
	echo "  deploy    Deploy worker to Cloudflare"
	echo "  register  Register slash commands with Discord"
	echo "  all       Deploy then register"
	exit 1
}

cmd="${1:-}"
[[ -z "$cmd" ]] && usage

deploy() {
	echo "=== Deploying worker ==="
	if [[ -f "$ENV_FILE" ]]; then
		export $(grep -v '^\s*#' "$ENV_FILE" | xargs)
	fi
	if [[ -f "$VARS_FILE" ]]; then
		export $(grep -v '^\s*#' "$VARS_FILE" | xargs)
	fi
	npx wrangler deploy
}

register() {
	echo "=== Registering commands ==="
	if [[ ! -f "$ENV_FILE" ]]; then
		echo "Error: $ENV_FILE not found" >&2
		exit 1
	fi
	node --env-file="$ENV_FILE" --import tsx src/register-commands.ts
}

case "$cmd" in
	deploy) deploy ;;
	register) register ;;
	all)
		deploy
		register
		;;
	*) usage ;;
esac
