#!/usr/bin/env bun

interface ArgDefinition {
  name: string;
  alias?: string;
  type: "string" | "number" | "boolean";
  default?: unknown;
  description: string;
}

interface ParsedArgs {
  [key: string]: string | number | boolean | undefined;
}

class ArgParser {
  private definitions: Map<string, ArgDefinition> = new Map();
  private aliases: Map<string, string> = new Map();

  define(def: ArgDefinition): this {
    this.definitions.set(def.name, def);
    if (def.alias) this.aliases.set(def.alias, def.name);
    return this;
  }

  parse(argv: string[]): ParsedArgs {
    const result: ParsedArgs = {};
    
    // Set defaults
    for (const [name, def] of this.definitions) {
      if (def.default !== undefined) result[name] = def.default as string | number | boolean;
    }

    for (const arg of argv) {
      const eqIdx = arg.indexOf("=");
      let key: string;
      let value: string | undefined;

      if (eqIdx !== -1) {
        key = arg.slice(0, eqIdx);
        value = arg.slice(eqIdx + 1);
      } else {
        key = arg;
      }

      // Strip dashes
      key = key.replace(/^-{1,2}/, "");
      
      // Resolve alias
      const resolvedKey = this.aliases.get(key) ?? key;
      const def = this.definitions.get(resolvedKey);
      
      if (!def) continue;

      switch (def.type) {
        case "boolean":
          result[resolvedKey] = value === undefined || value === "true";
          break;
        case "number":
          result[resolvedKey] = value !== undefined ? parseInt(value, 10) : def.default as number;
          break;
        case "string":
          result[resolvedKey] = value ?? (def.default as string);
          break;
      }
    }

    return result;
  }

  help(): string {
    const lines = ["matrix-bun [options]\n", "Options:"];
    for (const [, def] of this.definitions) {
      const alias = def.alias ? `-${def.alias}, ` : "    ";
      const defaultVal = def.default !== undefined ? ` (default: ${def.default})` : "";
      lines.push(`  ${alias}--${def.name.padEnd(12)} ${def.description}${defaultVal}`);
    }
    return lines.join("\n");
  }
}

const parser = new ArgParser()
  .define({ name: "seed", alias: "s", type: "number", description: "Seed for reproducible randomness" })
  .define({ name: "fps", alias: "f", type: "number", default: 30, description: "Target frames per second" })
  .define({ name: "trail", alias: "t", type: "number", default: 20, description: "Trail length" })
  .define({ name: "help", alias: "h", type: "boolean", default: false, description: "Show this help message" });

const args = parser.parse(Bun.argv.slice(2));

if (args.help) {
  Bun.write(Bun.stdout, parser.help() + "\n");
  process.exit(0);
}

// ═══════════════════════════════════════════════════════════════════════════
// Mulberry32 PRNG
// ═══════════════════════════════════════════════════════════════════════════

type RandomFn = () => number;

const mulberry32 = (seed: number): RandomFn => {
  let a = seed | 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
};

const random: RandomFn = args.seed !== undefined 
  ? mulberry32(args.seed as number) 
  : Math.random;

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHAR_LEN = CHARS.length;
const TRAIL_LENGTH = (args.trail as number) || 20;
const TARGET_FPS = (args.fps as number) || 30;

const ESC = "\x1b[";
const HIDE_CURSOR = `${ESC}?25l`;
const SHOW_CURSOR = `${ESC}?25h`;
const CLEAR_SCREEN = `${ESC}2J`;
const RESET = `${ESC}0m`;

const rgb = (r: number, g: number, b: number) => `${ESC}38;2;${r};${g};${b}m`;
const moveTo = (row: number, col: number) => `${ESC}${row};${col}H`;

const COLORS: string[] = new Array(TRAIL_LENGTH);

for (let i = 0; i < TRAIL_LENGTH; i++) {
  const t = i / (TRAIL_LENGTH - 1);
  const ease = t * t * (3 - 2 * t);
  
  const r = Math.round(255 * Math.pow(1 - t, 3));
  const g = Math.round(255 - 180 * ease);
  const b = Math.round(255 * Math.pow(1 - t, 4));
  
  COLORS[i] = rgb(r, g, b);
}

interface Drop {
  y: number;
  speed: number;
  chars: Uint16Array;
  nextUpdate: number;
}

class MatrixRain {
  private width: number;
  private height: number;
  private drops: Drop[];
  private buffer: string[] = [];
  private lastFrame: number = 0;
  private running = true;

  constructor() {
    this.width = process.stdout.columns || 80;
    this.height = process.stdout.rows || 24;
    this.drops = new Array(this.width);
    
    for (let x = 0; x < this.width; x++) {
      this.drops[x] = this.createDrop(true);
    }
  }

  private createDrop(randomStart: boolean): Drop {
    const chars = new Uint16Array(TRAIL_LENGTH);
    for (let i = 0; i < TRAIL_LENGTH; i++) {
      chars[i] = (random() * CHAR_LEN) | 0;
    }
    return {
      y: randomStart ? -((random() * this.height) | 0) : -TRAIL_LENGTH,
      speed: 0.3 + random() * 0.7,
      chars,
      nextUpdate: 0
    };
  }

  private randomChar(): number {
    return (random() * CHAR_LEN) | 0;
  }

  private render(now: number): void {
    this.buffer.length = 0;

    for (let x = 0; x < this.width; x++) {
      let drop = this.drops[x]!;
      
      const col = x + 1;
      
      if (now >= drop.nextUpdate) {
        const eraseRow = (drop.y | 0) - TRAIL_LENGTH;
        if (eraseRow >= 1 && eraseRow <= this.height) {
          this.buffer.push(`${moveTo(eraseRow, col)} `);
        }
        
        drop.y += 1;
        drop.nextUpdate = now + (100 / drop.speed);
        
        if (random() < 0.3) {
          drop.chars[(random() * TRAIL_LENGTH) | 0] = this.randomChar();
        }
      }

      if (drop.y - TRAIL_LENGTH > this.height) {
        drop = this.drops[x] = this.createDrop(false);
      }

      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const row = (drop.y | 0) - i;
        if (row < 1 || row > this.height) continue;
        
        const char = CHARS[drop.chars[i]!]!;
        
        if (i === 0 && random() < 0.1) {
          this.buffer.push(`${moveTo(row, col)}${rgb(255, 255, 255)}${char}`);
        } else {
          this.buffer.push(`${moveTo(row, col)}${COLORS[i]!}${char}`);
        }
      }
    }

    Bun.write(Bun.stdout, this.buffer.join(""));
  }

  async run(): Promise<void> {
    Bun.write(Bun.stdout, HIDE_CURSOR + CLEAR_SCREEN);

    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());

    process.stdout.on("resize", () => {
      const newWidth = process.stdout.columns || 80;
      const newHeight = process.stdout.rows || 24;
      
      if (newWidth !== this.width) {
        const oldDrops = this.drops;
        this.drops = new Array(newWidth);
        for (let x = 0; x < newWidth; x++) {
          this.drops[x] = (x < oldDrops.length ? oldDrops[x] : null) ?? this.createDrop(true);
        }
      }
      
      this.width = newWidth;
      this.height = newHeight;
      Bun.write(Bun.stdout, CLEAR_SCREEN);
    });

    const frameTime = 1000 / TARGET_FPS;

    while (this.running) {
      const now = performance.now();
      
      if (now - this.lastFrame >= frameTime) {
        this.render(now);
        this.lastFrame = now;
      }
      
      await Bun.sleep(5);
    }
  }

  private stop(): void {
    this.running = false;
    Bun.write(Bun.stdout, RESET + SHOW_CURSOR + CLEAR_SCREEN + moveTo(1, 1));
    process.exit(0);
  }
}

const matrix = new MatrixRain();
matrix.run();
