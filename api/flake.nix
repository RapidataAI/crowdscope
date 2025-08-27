{
  description = "CrowdScope API development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = [
            (pkgs.python313.withPackages (ps: with ps; [
              pip
              flask
              sqlalchemy
              flask-sqlalchemy
              flask-cors
              pandas
              numpy
              requests
              python-dotenv
              psycopg2
              pyjwt
              cryptography
            ]))
            pkgs.postgresql
          ];

         
          shellHook = ''
            # Create a temporary directory for pip packages
            export PIP_PREFIX="$(pwd)/.pip-packages"
            export PYTHONPATH="$PIP_PREFIX/lib/python3.13/site-packages:$PYTHONPATH"
            export PATH="$PIP_PREFIX/bin:$PATH"
            
            # Install rapidata to the local project directory
            pip install -U --prefix="$PIP_PREFIX" rapidata
            
            echo "CrowdScope API development environment ready!"
            echo "Run: python index.py"
          '';
        };
      }
    );
}