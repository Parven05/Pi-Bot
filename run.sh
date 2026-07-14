#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$ROOT_DIR/secrets/.env"
REGISTER_SCRIPT="$ROOT_DIR/scripts/register-commands.ts"

usage() {
	echo "Usage: $0 <command>"
	echo ""
	echo "Commands:"
	echo "  deploy    Deploy worker to Cloudflare"
	echo "  register  Register slash commands with Discord"
	echo "  all       Deploy then register"
	exit 1
}

# Loads a dotenv-style file into the current shell's environment.
# Safer than `export $(grep ... | xargs)`: handles quoted values, values
# containing spaces, and blank/comment lines without word-splitting them.
load_env_file() {
	local file="$1"
	[[ -f "$file" ]] || return 0
	set -a
	# shellcheck disable=SC1090
	source "$file"
	set +a
}

deploy() {
	echo "=== Deploying worker ==="
	load_env_file "$ENV_FILE"
	npx wrangler deploy
}

register() {
	echo "=== Registering commands ==="
	if [[ ! -f "$ENV_FILE" ]]; then
		echo "Error: $ENV_FILE not found" >&2
		exit 1
	fi
	if [[ ! -f "$REGISTER_SCRIPT" ]]; then
		echo "Error: $REGISTER_SCRIPT not found" >&2
		exit 1
	fi
	load_env_file "$ENV_FILE"
	npx tsx "$REGISTER_SCRIPT"
}

cmd="${1:-}"
[[ -z "$cmd" ]] && usage

case "$cmd" in
	deploy) deploy ;;
	register) register ;;
	all)
		deploy
		register
		;;
	*) usage ;;
esac
