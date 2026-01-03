# ShareFeed

ShareFeed allows a group of people to share websites, videos, and other web content with each other. It features a dead-simple UI suitable for users of all technical levels, designed to replace mindless social media scrolling with meaningful relational sharing.

## Overview

ShareFeed consists of two components across two repositories:

1. **This repo (`sharefeed`)** - Holochain app, UI, and browser extension
2. **[`sharefeed-desktop`](https://github.com/zippy/sharefeed-desktop)** - Desktop app wrapper (based on Kangaroo)

All data is stored on the Holochain distributed network, giving you full ownership and control of your data.

## Installation

### Desktop App

1. Download the latest release from [sharefeed-desktop releases](https://github.com/zippy/sharefeed-desktop/releases)
2. Run the installer for your platform:
   - **Windows**: Run `ShareFeed-Setup.exe`
   - **macOS**: Open `ShareFeed.dmg` and drag to Applications
   - **Linux**: Run `ShareFeed.AppImage` or install the `.deb` package

### Browser Extension

#### From Release (Recommended)

1. Download `sharefeed-extension.zip` from the [Releases page](https://github.com/zippy/sharefeed/releases)
2. Unzip to a folder on your computer
3. Open Chrome and go to `chrome://extensions`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked" and select the unzipped folder
6. The ShareFeed icon will appear in your browser toolbar

#### From Source

```bash
cd extension
npm install
npm run build
```
Then load the `extension/dist` folder as an unpacked extension.

## Usage

1. **Start the Desktop App** - Launch ShareFeed from your applications
2. **Share Content** - Click the ShareFeed icon in your browser while viewing any webpage
3. **Add Details** - Optionally add a note or highlight specific text
4. **View Feed** - Open the desktop app to see shares from your group

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Rust](https://rustup.rs/) (for Holochain development)
- [Holochain CLI tools](https://developer.holochain.org/get-started/)

### Setup

```bash
# Clone both repositories
git clone https://github.com/zippy/sharefeed.git
git clone https://github.com/zippy/sharefeed-desktop.git

cd sharefeed
npm install

cd ../sharefeed-desktop
yarn install
```

### Project Structure

```
sharefeed/                    # This repo
├── dnas/                     # Holochain DNA (backend)
│   └── sharefeed/
│       └── zomes/
│           ├── integrity/    # Data validation
│           └── coordinator/  # Business logic
├── extension/                # Chrome browser extension
│   └── src/
│       ├── popup/            # Extension popup UI
│       ├── background/       # Service worker
│       └── storage/          # Holochain integration
├── ui/                       # Svelte web UI
└── workdir/                  # Build output (.happ, .webhapp)

sharefeed-desktop/            # Separate repo
├── src/main/                 # Electron main process
├── pouch/                    # Place .webhapp here
└── kangaroo.config.ts        # App configuration
```

### Running in Development

#### Holochain App + UI (without desktop wrapper)

```bash
# Start with one agent
npm run start

# Start with two agents (for testing multi-user)
npm run start:2
```

#### Extension Only

```bash
cd extension
npm run dev
```
Then load `extension/dist` as an unpacked extension in Chrome.

#### Full Desktop App

```bash
# In sharefeed repo: build and deploy webhapp
npm run deploy:desktop

# In sharefeed-desktop repo: run the desktop app
cd ../sharefeed-desktop
yarn dev
```

### Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration
```

### Building for Release

#### Extension

```bash
# Creates sharefeed-extension.zip in repo root
npm run package:extension
```

#### Desktop App

```bash
# In sharefeed repo: build webhapp
npm run package

# Copy to desktop repo
cp workdir/sharefeed.webhapp ../sharefeed-desktop/pouch/

# In sharefeed-desktop: build for your platform
cd ../sharefeed-desktop
yarn build:linux    # or build:win, build:mac-arm64, build:mac-x64
```

The desktop repo has GitHub Actions that automatically build releases for all platforms when you push to the `release` branch.

## Architecture

### Holochain Backend

ShareFeed uses Holochain for decentralized data storage and peer-to-peer networking:

- **No central server** - Data is stored across participants' devices
- **Cryptographic identity** - Each user has a unique keypair
- **DHT storage** - Shares are distributed across the network

### Browser Extension

The extension connects directly to the local Holochain conductor:

- **Fixed ports** - Admin: 21211, App: 21212
- **WebSocket connection** - Uses @holochain/client
- **Fallback storage** - Local storage when Holochain unavailable

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow existing code style
- Add tests for new features
- Update documentation as needed

## License

This project is licensed under the Cryptographic Autonomy License 1.0 (CAL-1.0). See the [LICENSE](LICENSE) file for details.

The CAL-1.0 ensures that:
- You can freely use, modify, and distribute this software
- Recipients maintain full control of their own data
- Source code remains available to all users

## Acknowledgments

- Built on [Holochain](https://holochain.org)
- Desktop wrapper by [Kangaroo](https://github.com/holochain/kangaroo-electron)
- UI framework: [Svelte](https://svelte.dev)
