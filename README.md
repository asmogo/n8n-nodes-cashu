# n8n-nodes-cashu

Community n8n nodes for building Cashu wallets and Lightning workflows powered by coco-cashu-core, with optional persistent storage via SQLite.

- Cashu: Ecash over Lightning using the Cashu protocol
- coco-cashu-core: Headless wallet and services (quotes, proofs, history, subscriptions)
- coco-cashu-sqlite3: SQLite-backed repositories for persistence

This package provides:

- n8n Nodes:
  - CashuCoco: wallet operations (mint add, send, receive, balances, quotes, etc.)
- Credentials:
  - CashuCoco: wallet seed and settings

The core wallet manager is built in ['nodes/CashuCoco/CashuManager.ts'](nodes/CashuCoco/CashuManager.ts), which wires coco-cashu-core with in-memory or SQLite repositories.

## Quick start

1. Requirements

- Node.js >= 20.15
- npm >= 9

2. Install dependencies

```
npm install
```

3. Build

```
npm run build
```

4. Use in your n8n instance

- Copy/link the built dist folder into your n8n community nodes location OR publish and install from your registry.
- Restart n8n; the nodes should appear in the editor.

5. Configure credentials

- Create a CashuCoco credential with a wallet seed (64-byte hex or BIP39 mnemonic).

## Installation

This repository is an n8n community node package. For local development:

```
git clone <this-repo>
cd n8n-coco
npm install
npm run build

```

This produces dist/\* files that n8n loads according to the package's n8n metadata in ['package.json'](package.json:37-46).

For production:

- Publish the package to your internal registry or npm, then install it into your n8n environment.
- Or mount/copy the repository into n8n’s community nodes directory and run npm run build inside it.

## Supported operations

coco-cashu-core Manager APIs exposed through the nodes:

- Mints
  - Add/update mint by URL
  - Fetch mint info and keysets
  - List known mints
- Wallet
  - Receive token
  - Send token with amount selection
  - Get balances aggregated by mint
- Quotes
  - Create mint quotes (bolt11 invoices)
  - Redeem mint quotes
- Melt (spend)
  - Create melt quotes (pay Lightning invoice)
  - Pay melt quote
- Proofs
  - Select proofs to send
  - Persist and update proof states

## License

MIT — see package license field.
