import { nextTick, reactive, ref, watch, type Ref } from 'vue';

export interface ServerConfiguration {
    disablePublicNetwork?: boolean;
    disablePublicIpv4?: boolean;
    disablePublicIpv6?: boolean;
    usePrivateNetwork?: boolean;

    sshKeyId?: number;
    firewallIds?: number[];
    networkIds?: number[];
    placementGroupId?: number;

    serverImage?: number;
    serverType?: string;
    serverLocation?: string;

    additionalUserData?: string;

    serverLabels?: Record<string, string>;
}

export interface MachineConfigValue {
    serverType?: string;
    serverLocation?: string;
    imageId?: string | number;
    placementGroup?: string | number;
    networks?: (string | number)[];
    firewalls?: (string | number)[];
    existingKeyId?: string | number;
    usePrivateNetwork?: boolean;
    disablePublic?: boolean;
    disablePublicIpv4?: boolean;
    disablePublicIpv6?: boolean;
    additionalUserData?: string;
    userDataFromFile?: boolean;
    serverLabel?: string[];
}

export interface ValidationError {
    field: string;
    message: string;
}

function toStringOrUndefined(val: any): string | undefined {
    return val != null ? String(val) : undefined;
}

function toNumberOrUndefined(val: any): number | undefined {
    if (val == null) return undefined;
    return typeof val === 'string' ? Number(val) : val;
}

function toNumberArray(arr: any[] | undefined): number[] {
    if (!Array.isArray(arr)) return [];
    return arr.map(id => typeof id === 'string' ? Number(id) : id);
}

export function useServerConfigSync(
    propsValue: Ref<MachineConfigValue>,
    emit: (event: 'validationChanged', isValid: boolean) => void
) {
    const serverConfiguration = reactive<ServerConfiguration>({
        disablePublicNetwork: false,
        disablePublicIpv4: false,
        disablePublicIpv6: false,
        usePrivateNetwork: false,
        sshKeyId: undefined,
        firewallIds: [],
        networkIds: [],
        placementGroupId: undefined,
        serverImage: undefined,
        serverType: undefined,
        serverLocation: undefined,
        additionalUserData: undefined,
        serverLabels: {}
    });

    const syncingToProps = ref(false);
    const syncingFromProps = ref(false);
    const isValid = ref(false);
    const validationErrors = ref<ValidationError[]>([]);

    function validate(): ValidationError[] {
        const errors: ValidationError[] = [];

        if (!serverConfiguration.serverLocation) {
            errors.push({ field: 'serverLocation', message: 'Location is required' });
        }
        if (!serverConfiguration.serverType) {
            errors.push({ field: 'serverType', message: 'Server type is required' });
        }
        if (!serverConfiguration.serverImage) {
            errors.push({ field: 'serverImage', message: 'Image is required' });
        }

        const hasPublicNetworkRestriction =
            serverConfiguration.disablePublicNetwork ||
            serverConfiguration.disablePublicIpv4 ||
            serverConfiguration.disablePublicIpv6;

        if (hasPublicNetworkRestriction && !serverConfiguration.usePrivateNetwork) {
            errors.push({
                field: 'network',
                message: 'Private network must be enabled when disabling public network access'
            });
        }

        if (serverConfiguration.usePrivateNetwork && !serverConfiguration.networkIds?.length) {
            errors.push({
                field: 'networkIds',
                message: 'At least one network must be selected when using private network'
            });
        }

        return errors;
    }

    function getErrorForField(field: string): string | undefined {
        return validationErrors.value.find(e => e.field === field)?.message;
    }

    function hasError(field: string): boolean {
        return validationErrors.value.some(e => e.field === field);
    }

    async function syncToProps() {
        if (!isValid.value) return;

        syncingToProps.value = true;

        const value = propsValue.value;
        value.serverType = toStringOrUndefined(serverConfiguration.serverType);
        value.serverLocation = toStringOrUndefined(serverConfiguration.serverLocation);
        value.imageId = toStringOrUndefined(serverConfiguration.serverImage);
        value.placementGroup = toStringOrUndefined(serverConfiguration.placementGroupId);

        value.networks = serverConfiguration.networkIds?.map(id => id?.toString()) || [];
        value.firewalls = serverConfiguration.firewallIds?.map(id => id?.toString()) || [];
        value.existingKeyId = toStringOrUndefined(serverConfiguration.sshKeyId);

        value.usePrivateNetwork = serverConfiguration.usePrivateNetwork;
        if (serverConfiguration.disablePublicNetwork) {
            value.disablePublic = true;
            value.disablePublicIpv4 = false;
            value.disablePublicIpv6 = false;
        } else {
            value.disablePublic = false;
            value.disablePublicIpv4 = serverConfiguration.disablePublicIpv4;
            value.disablePublicIpv6 = serverConfiguration.disablePublicIpv6;
        }

        value.additionalUserData = serverConfiguration.additionalUserData;
        value.userDataFromFile = true;

        value.serverLabel = serverConfiguration.serverLabels
            ? Object.entries(serverConfiguration.serverLabels).map(([key, val]) => `${key}=${val}`)
            : [];

        await nextTick();
        syncingToProps.value = false;
    }

    function syncFromProps(newValue: MachineConfigValue) {
        syncingFromProps.value = true;

        serverConfiguration.serverType = toStringOrUndefined(newValue.serverType);
        serverConfiguration.serverLocation = toStringOrUndefined(newValue.serverLocation);
        serverConfiguration.serverImage = toNumberOrUndefined(newValue.imageId);
        serverConfiguration.placementGroupId = toNumberOrUndefined(newValue.placementGroup);
        serverConfiguration.networkIds = toNumberArray(newValue.networks);
        serverConfiguration.firewallIds = toNumberArray(newValue.firewalls);
        serverConfiguration.sshKeyId = toNumberOrUndefined(newValue.existingKeyId);

        serverConfiguration.usePrivateNetwork = newValue.usePrivateNetwork;
        serverConfiguration.disablePublicNetwork = newValue.disablePublic;
        serverConfiguration.disablePublicIpv4 = newValue.disablePublicIpv4;
        serverConfiguration.disablePublicIpv6 = newValue.disablePublicIpv6;

        serverConfiguration.additionalUserData = newValue.additionalUserData || '';
        serverConfiguration.serverLabels = Object.fromEntries(
            (newValue.serverLabel || []).map((label: string) => label.split('='))
        );

        syncingFromProps.value = false;
    }

    // Watch for external prop changes
    watch(propsValue, async (newValue) => {
        if (syncingToProps.value) return;
        syncFromProps(newValue);
        await nextTick();
    }, { immediate: true, deep: true });

    // Watch for private network changes - clear related options when disabled
    watch(() => serverConfiguration.usePrivateNetwork, (usePrivate) => {
        if (!usePrivate && !syncingFromProps.value) {
            serverConfiguration.disablePublicNetwork = false;
            serverConfiguration.disablePublicIpv4 = false;
            serverConfiguration.disablePublicIpv6 = false;
        }
    });

    // Watch for network selection - clear options when no networks selected
    watch(() => serverConfiguration.networkIds, (networkIds) => {
        if ((!networkIds || networkIds.length === 0) && !syncingFromProps.value) {
            serverConfiguration.disablePublicNetwork = false;
        }
    });

    // Watch for local configuration changes
    watch(serverConfiguration, async () => {
        validationErrors.value = validate();
        const valid = validationErrors.value.length === 0;
        isValid.value = valid;
        emit('validationChanged', valid);

        if (valid && !syncingFromProps.value) {
            await syncToProps();
        }
    }, { immediate: true, deep: true });

    return {
        serverConfiguration,
        isValid,
        validationErrors,
        syncingFromProps,
        syncingToProps,
        getErrorForField,
        hasError,
    };
}
