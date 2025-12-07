# Rancher Node Driver UI Extension for Hetzner Cloud

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project implements a custom node driver UI extension for Rancher, enabling users to provision and manage nodes in Hetzner Cloud using the new v3 extension API.

> **Important:** This UI extension is designed to work exclusively with the [CosmoAbdon/docker-machine-driver-hetzner](https://github.com/CosmoAbdon/docker-machine-driver-hetzner) driver. Using other driver versions may result in missing features or unexpected behavior.

## Requirements

- Rancher v2.7+ with Extensions support enabled
- Kubernetes cluster managed by Rancher
- Hetzner Cloud account with API token

## Features

- Seamless integration with Rancher for creating and managing Hetzner Cloud nodes
- Full compatibility with RKE2 clusters
- Dynamic selection of server location, type, image, placement group, networks, firewalls, and SSH keys
- Support for private networking
- Vue 3 UI with Rancher look and feel
- Real-time form validation with user-friendly error messages

## Quick Start

### 1. Add the node driver

Apply the following YAML configuration to your Rancher cluster:

```bash
kubectl apply -f - <<EOF
apiVersion: management.cattle.io/v3
kind: NodeDriver
metadata:
  annotations:
    lifecycle.cattle.io/create.node-driver-controller: "true"
    privateCredentialFields: apiToken
  name: hetzner
spec:
  active: true
  addCloudCredential: true
  builtin: false
  checksum: "5d6949da9c6f69da82c5010b764326ce2d9e917c16e921541d625b4877376182"
  description: ""
  displayName: Hetzner
  externalId: ""
  url: https://github.com/CosmoAbdon/docker-machine-driver-hetzner/releases/download/v1.0.0/docker-machine-driver-hetzner_1.0.0_linux_amd64.tar.gz
  whitelistDomains:
  - api.hetzner.cloud
EOF
```

> **Warning:** Do not add the node driver via the Rancher UI. Otherwise the credential annotation is missing, and you will not be able to create cloud credentials for Hetzner.

### 2. Install the extension

1. In Rancher, navigate to **Extensions**
2. Open the three-dot context menu and select **Manage repositories**
3. Add a new HTTPS repository: `https://rancher-ui-driver-hetzner.cosmoabdon.me`
4. Navigate back to **Extensions** and install the **Hetzner Node Driver** extension

### 3. Add a cloud credential

1. Navigate to **Cluster Management** → **Cloud Credentials**
2. Create a new cloud credential for Hetzner
3. Add a read-write API token from your Hetzner Cloud project

See the [Hetzner documentation](https://docs.hetzner.com/cloud/api/getting-started/generating-api-token/) for details on creating API tokens.

### 4. Create a cluster

You should now be able to create a new cluster using the Hetzner driver. If you want to use private networks for communication, make sure that Rancher can reach the private Hetzner network.

## Credits

This project builds upon the excellent work of:
- [mxschmitt/ui-driver-hetzner](https://github.com/mxschmitt/ui-driver-hetzner) - Original UI driver for Hetzner
- [JonasProgrammer/docker-machine-driver-hetzner](https://github.com/JonasProgrammer/docker-machine-driver-hetzner) - Original Docker Machine driver
- [bluquist/docker-machine-driver-hetzner](https://github.com/bluquist/docker-machine-driver-hetzner) - Rancher-specific fork with RKE2 adjustments

## Fork Changes

This fork introduces the following improvements:

### UI Extension
- Refactored codebase using Vue 3 Composition API with composables
- Added validation feedback with visible error messages
- Improved network validation logic with clear user feedback
- Better type safety with TypeScript interfaces

### Driver ([CosmoAbdon/docker-machine-driver-hetzner](https://github.com/CosmoAbdon/docker-machine-driver-hetzner))
- Improved SSH key handling for Rancher/RKE2 environments
- When using an existing SSH key, the driver automatically generates an additional local key
- Both keys are added to the server, ensuring seamless SSH access for both Rancher and docker-machine

## Troubleshooting

### Cannot create cloud credentials for Hetzner
Make sure you applied the node driver via `kubectl` and not through the Rancher UI. The `privateCredentialFields: apiToken` annotation is required.

### Server creation fails with SSH key error
Ensure you're using the [CosmoAbdon/docker-machine-driver-hetzner](https://github.com/CosmoAbdon/docker-machine-driver-hetzner) driver, which handles SSH keys correctly for Rancher environments.

### Extension not showing in Rancher
1. Check that Extensions are enabled in your Rancher installation
2. Verify the repository URL is correct: `https://rancher-ui-driver-hetzner.cosmoabdon.me`
3. Try refreshing the Extensions page

## Development

See the [Rancher extension documentation](https://extensions.rancher.io/extensions/next/introduction) for details.

### Run in development mode

```bash
API=<URL_TO_RANCHER> yarn dev
```

### Build for production

```bash
yarn build-pkg hetzner-node-driver
```

The built extension will be available in `dist-pkg/`.

### Project Structure

```
pkg/hetzner-node-driver/
├── machine-config/
│   └── hetzner.vue          # Main UI component
├── composables/
│   └── useServerConfigSync.ts # State management and validation
├── hcloud.ts                 # Hetzner Cloud API client
└── l10n/                     # Translations
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## References

- [Rancher Extension Documentation](https://extensions.rancher.io/extensions/next/introduction)
- [Hetzner Cloud API](https://docs.hetzner.cloud)
- [Docker Machine Driver (CosmoAbdon fork)](https://github.com/CosmoAbdon/docker-machine-driver-hetzner)
