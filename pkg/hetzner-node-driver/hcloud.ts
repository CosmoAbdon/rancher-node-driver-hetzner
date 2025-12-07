export interface HetznerOption {
    // These keys will be auto-mapped by v-select
    label: string;
    value: string | number
}

export class HetznerCloud {
    private credentialId: string;

    private readonly BASE_URL = '/meta/proxy/api.hetzner.cloud/v1';

    constructor(credentialId: string) {
        this.credentialId = credentialId;
    }

    public async getLocations(): Promise<HetznerOption[]> {
        const response = await this.request('/locations');
        return response.locations.map((location: any) => ({
            value: location.name,
            label: `${location.name} (${location.description})`,
        }));
    }

    public async getServerTypes(location?: string): Promise<HetznerOption[]> {
        const response = await this.request('/server_types?per_page=50');
        let serverTypes = response.server_types.filter((type: any) => !type.deprecated);

        if (location) {
            serverTypes = serverTypes.filter((type: any) =>
            type.prices.some((price: any) => price.location === location)
            );
        }

        return serverTypes.map((type: any) => {
            let priceLabel = '';
            if (location) {
                const price = type.prices.find((p: any) => p.location === location);
                if (price) {
                    priceLabel = `€${Number(price.price_monthly.gross).toFixed(2)}/mo, `;
                }
            }
            return {
            value: type.name,
            label: `${type.name} (${priceLabel}${type.architecture}, ${type.cores} vCPU, ${type.memory} GB RAM, ${type.disk} GB SSD)`,
            };
        });
    }

    public async getImages(): Promise<HetznerOption[]> {
        const response = await this.request('/images?per_page=50');
        return response.images.map((image: any) => ({
            value: image.id,
            label: `${image.name} (${image.architecture}) - ${image.description}`,
        }));
    }

    public async getPlacementGroups(): Promise<HetznerOption[]> {
        const response = await this.request('/placement_groups?per_page=50');
        return response.placement_groups.map((pg: any) => ({
            value: pg.id,
            label: pg.name,
        }));
    }

    public async getNetworks(): Promise<HetznerOption[]> {
        const response = await this.request('/networks?per_page=50');
        return response.networks.map((network: any) => ({
            value: network.id,
            label: `${network.name} (${network.ip_range})`,
        }));
    }

    public async getFirewalls(): Promise<HetznerOption[]> {
        const response = await this.request('/firewalls?per_page=50');
        return response.firewalls.map((firewall: any) => ({
            value: firewall.id,
            label: firewall.name,
        }));
    }

    public async getSshKeys(): Promise<HetznerOption[]> {
        const response = await this.request('/ssh_keys?per_page=50');
        return response.ssh_keys.map((key: any) => ({
            value: key.id,
            label: key.name,
        }));
    }

    private async request(endpoint: string, method: string = 'GET', body?: any): Promise<any> {
        const url = `${this.BASE_URL}${endpoint}`;
        const headers: HeadersInit = {
                'X-Api-CattleAuth-Header': `Bearer credID=${this.credentialId} passwordField=apiToken`,
        }
        if (body) {
            headers['Content-Type'] = 'application/json';
        }
        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}