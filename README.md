<div align="center">

# matrix-bun

[![Release](https://img.shields.io/github/v/release/itsmelouis/matrix-bun?style=flat-square)](https://github.com/itsmelouis/matrix-bun/releases)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](./LICENSE)
[![Bun](https://img.shields.io/badge/bun-v1.3.3+-black?style=flat-square&logo=bun)](https://bun.com)

The Matrix Digital Rain effect in your terminal.

High-performance CLI animation with ANSI RGB gradients, and zero dependencies.

[Install](#install) • [Usage](#usage) • [Options](#options)

</div>

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/itsmelouis/matrix-bun/main/install.sh | bash
```

## Usage

```bash
matrix-bun
```

## Options

```
matrix-bun [options]

Options:
  -s, --seed         Seed for reproducible randomness
  -f, --fps          Target frames per second (default: 30)
  -t, --trail        Trail length (default: 20)
  -h, --help         Show this help message
```

### Examples

```bash
matrix-bun --seed=42          # Reproducible animation
matrix-bun --fps=60 --trail=15 # Faster with shorter trails
matrix-bun -s=12345           # Same animation every time
```

## Features

- **Zero dependencies** — Pure TypeScript with Bun runtime
- **High performance** — 30 FPS by default, configurable up to 60+
- **Responsive** — Auto-adapts to terminal resize
- **Portable** — Single executable, ~100MB (includes Bun runtime)

## Development

```bash
bun run index.ts
bun run index.ts --seed=42
```

Build executable:

```bash
bun build --compile --outfile matrix-bun ./index.ts
```

## License

MIT © [Louis F.](https://github.com/itsmelouis)
