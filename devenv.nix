{ pkgs, ... }:

{
  packages = with pkgs; [
    python312
    python312Packages.pip
    python312Packages.virtualenv
    python312Packages.setuptools
  ];

  enterShell = ''
    export PIP_REQUIRE_VIRTUALENV=false
    if [ ! -d .venv ]; then
      python -m venv .venv
      echo "Created .venv"
    fi
    source .venv/bin/activate
    if [ -f requirements.txt ]; then
      pip install -r requirements.txt --quiet 2>/dev/null
    fi
  '';

  scripts = {
    run-bot.exec = "python bot.py";
    dev.exec = "python";
  };
}
