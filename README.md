<div align="center">

<img src="./assets/logo.svg" alt="Graphene Logo" width="180">

# Graphene

**Visual code intelligence. Drop a folder. Watch the dependency graph appear.**

[![License: MIT](https://img.shields.io/badge/License-MIT-6f5ce8.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-10d9a0.svg)](https://github.com/saqlain2204/graphene/pulls)
[![No telemetry](https://img.shields.io/badge/telemetry-none-green.svg)](#privacy)
[![Client only](https://img.shields.io/badge/runs-in%20browser-blue.svg)](#how-it-works)

[Report a Bug](https://github.com/saqlain2204/graphene/issues) &nbsp;&middot;&nbsp; [Request a Feature](https://github.com/saqlain2204/graphene/issues)

</div>

---

## What is Graphene?

Graphene is a browser-based tool that turns any codebase into an interactive dependency graph. Drop a project folder and Graphene reads every file, extracts symbols, resolves cross-file connections, and renders a live force-directed graph so you can see exactly how your code is wired together.

No accounts. No installs. No code leaves your machine.

It is useful when you inherit an unfamiliar codebase, join a new team, or return to a project after a long break and need to get oriented fast.

---

## Features

- **Live dependency graph** - Force-directed graph renders every import, class extension, and function call as a typed edge. The shape of your architecture becomes visible in seconds.
- **Symbol extraction** - Functions, classes, imports, and exports are automatically pulled from every file. Click any symbol to jump to it.
- **Why connected** - Click any node to see the exact reason two files are linked: which function is called, which class is extended, which module is imported.
- **Inline source viewer** - Read any file with full syntax highlighting without leaving the graph.
- **Smart filtering** - Toggle edge types and languages with one click. Focus on just the TypeScript imports, or just the class hierarchies.
- **Zero upload** - Everything runs entirely in your browser. Nothing is sent to a server.

---

## Supported Languages

JavaScript, TypeScript, Python, Java, Go, Rust, C++, C#, Ruby, PHP, Swift, Kotlin

---

## How It Works

```
01  drop    Drag your project folder onto the window, or click to browse.
02  parse   Graphene reads every file, extracts symbols, and resolves dependencies.
03  render  A live graph appears: nodes for files, typed edges for connections.
04  explore Click, zoom, filter, search. Open any file inline.
```

The entire pipeline runs in the browser. No configuration file required.

---

## Getting Started

```bash
git clone https://github.com/saqlain2204/graphene.git
cd graphene
npm install
npm run dev
```

---

## Project Structure

```
graphene/
├── index.html          Landing page
├── app.html            Main application
├── style.css           Global styles
├── src/                Source files
├── package.json
└── package-lock.json
```

---

## Privacy

Graphene is a client-only application. Your source code is read directly by the browser and processed in memory. It is never uploaded to any server. There is no analytics, no crash reporting, and no telemetry of any kind.

You can verify this by reading the source.

---

## Contributing

Contributions are welcome. Here is how to get started:

1. Fork the repository
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m "add your feature"`
4. Push the branch: `git push origin feature/your-feature-name`
5. Open a pull request

Have an idea? [Open an issue](https://github.com/saqlain2204/graphene/issues).

---

## License

MIT. See [LICENSE](LICENSE) for details.

---

<div align="center">

Built by [saqlain2204](https://github.com/saqlain2204) and contributors.

If Graphene is useful to you, consider starring the repo.

</div>