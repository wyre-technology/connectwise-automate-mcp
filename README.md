# ConnectWise Automate MCP Server

A Model Context Protocol (MCP) server for ConnectWise Automate with decision tree architecture for Claude.

## Features

- **Decision Tree Architecture**: Navigate between domains (computers, clients, alerts, scripts) to access relevant tools
- **Lazy Loading**: Client initialization and domain handlers are loaded on demand
- **Comprehensive API Coverage**: Manage computers, clients, alerts, and scripts

## Installation

```bash
npm install @wyre-technology/connectwise-automate-mcp
```

## Configuration

Set the following environment variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `CW_AUTOMATE_SERVER_URL` | Yes | Your ConnectWise Automate server URL |
| `CW_AUTOMATE_CLIENT_ID` | Yes | Integrator Client ID |
| `CW_AUTOMATE_USERNAME` | Yes | Integrator username or user credentials |
| `CW_AUTOMATE_PASSWORD` | Yes | Integrator password or user password |
| `CW_AUTOMATE_2FA_CODE` | No | Two-factor authentication code (if required) |

## Usage

### As an MCP Server

Add to your Claude configuration:

```json
{
  "mcpServers": {
    "connectwise-automate": {
      "command": "npx",
      "args": ["@wyre-technology/connectwise-automate-mcp"],
      "env": {
        "CW_AUTOMATE_SERVER_URL": "https://your-server.hostedrmm.com",
        "CW_AUTOMATE_CLIENT_ID": "your-client-id",
        "CW_AUTOMATE_USERNAME": "your-username",
        "CW_AUTOMATE_PASSWORD": "your-password"
      }
    }
  }
}
```

### Navigation

The server uses a decision tree pattern. Start by navigating to a domain:

1. Use `cwautomate_navigate` to select a domain (computers, clients, alerts, scripts)
2. Domain-specific tools become available
3. Use `cwautomate_back` to return to the main menu

### Available Domains

#### Computers
- List computers with filtering options
- Get computer details
- Search computers by name or criteria
- Reboot computers remotely
- Run scripts on computers

#### Clients
- List all clients
- Get client details
- Create new clients
- Update existing clients

#### Alerts
- List alerts with filtering
- Get alert details
- Acknowledge alerts

#### Scripts
- List available scripts
- Get script details
- Execute scripts on computers

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

## License

Apache-2.0
