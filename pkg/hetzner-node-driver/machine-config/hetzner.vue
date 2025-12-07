<script setup lang="ts">
import { computed, onMounted, ref, toRef, watch } from "vue";
import Loading from '@shell/components/Loading.vue';
import LabeledSelect from '@shell/components/form/LabeledSelect.vue';
import KeyValue from '@shell/components/form/KeyValue.vue';
import Checkbox from '@shell/rancher-components/Form/Checkbox/Checkbox.vue';
import YamlEditor from '@shell/components/YamlEditor.vue';
import Banner from '@shell/rancher-components/Banner/Banner.vue';
import { HetznerCloud, HetznerOption } from '../hcloud';
import { useServerConfigSync, type MachineConfigValue } from '../composables/useServerConfigSync';

interface Props {
    uuid: string;
    cluster?: Object;
    value: MachineConfigValue;
    credentialId: string;
    provider: string;
    disabled?: boolean;
    busy?: boolean;
}

interface HetznerOptions {
    locations: HetznerOption[];
    serverTypes: HetznerOption[];
    serverImages?: HetznerOption[];
    sshKeys?: HetznerOption[];
    firewalls?: HetznerOption[];
    networks?: HetznerOption[];
    placementGroups?: HetznerOption[];
}

const props = withDefaults(defineProps<Props>(), {
    cluster: () => ({}),
    disabled: false,
    busy: false,
});

const emit = defineEmits<{
    validationChanged: [isValid: boolean];
}>();

const hetznerOptions = ref<HetznerOptions>({
    locations: [],
    serverTypes: [],
    serverImages: [],
    sshKeys: [],
    firewalls: [],
    networks: [],
    placementGroups: []
});

const propsValueRef = toRef(props, 'value');
const {
    serverConfiguration,
    validationErrors,
    getErrorForField,
    hasError,
} = useServerConfigSync(propsValueRef, emit);

const loadingData = ref(true);
const initialLoad = ref(true);
const hcloud = ref<HetznerCloud | null>(null);

const isLoading = computed(() => loadingData.value || props.busy);

const networkValidationError = computed(() => {
    const networkError = getErrorForField('network');
    const networkIdsError = getErrorForField('networkIds');
    return networkError || networkIdsError;
});

watch(
    () => serverConfiguration.serverLocation,
    async (newLocation) => {
        if (hcloud.value) {
            loadingData.value = true;
            try {
                hetznerOptions.value.serverTypes = await hcloud.value.getServerTypes(newLocation);
                if (!hetznerOptions.value.serverTypes.some(type => type.value === serverConfiguration.serverType)) {
                    serverConfiguration.serverType = undefined;
                }
            } catch (error) {
                console.error('Failed to load server types:', error);
            } finally {
                loadingData.value = false;
            }
        }
    }
);

onMounted(async () => {
    hcloud.value = new HetznerCloud(props.credentialId);

    try {
        const [
            locations,
            serverTypes,
            serverImages,
            placementGroups,
            networks,
            sshKeys,
            firewalls
        ] = await Promise.all([
            hcloud.value.getLocations(),
            hcloud.value.getServerTypes(),
            hcloud.value.getImages(),
            hcloud.value.getPlacementGroups(),
            hcloud.value.getNetworks(),
            hcloud.value.getSshKeys(),
            hcloud.value.getFirewalls()
        ]);
        hetznerOptions.value.locations = locations;
        hetznerOptions.value.serverTypes = serverTypes;
        hetznerOptions.value.serverImages = serverImages;
        hetznerOptions.value.placementGroups = placementGroups;
        hetznerOptions.value.networks = networks;
        hetznerOptions.value.sshKeys = sshKeys;
        hetznerOptions.value.firewalls = firewalls;
    } catch (error) {
        console.error('Failed to load Hetzner data:', error);
    }

    loadingData.value = false;
    initialLoad.value = false;
});
</script>

<script lang="ts">
import CreateEditView from '@shell/mixins/create-edit-view';
import { defineComponent } from "vue";

export default defineComponent({
    mixins: [CreateEditView]
});
</script>

<template>
    <div>
        <Loading v-if="initialLoad" :delayed="true" />
        <div class="hetzner-config">
            <h2 class="mt-20 mb-20">{{ t('driver.hetzner.machine.server.title') }}</h2>
            <div class="row mt-10">
                <div class="col span-12">
                    <LabeledSelect
                        v-model:value="serverConfiguration.serverLocation"
                        :options="hetznerOptions.locations"
                        required
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.server.location.placeholder')"
                        :label="t('driver.hetzner.machine.server.location.label')"
                        :class="{ 'has-error': hasError('serverLocation') }"
                    />
                    <span v-if="hasError('serverLocation')" class="field-error">
                        {{ getErrorForField('serverLocation') }}
                    </span>
                </div>
            </div>
            <div class="row mt-10">
                <div class="col span-6">
                    <LabeledSelect
                        v-model:value="serverConfiguration.serverType"
                        :options="hetznerOptions.serverTypes"
                        required
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.server.type.placeholder')"
                        :label="t('driver.hetzner.machine.server.type.label')"
                        :class="{ 'has-error': hasError('serverType') }"
                    />
                    <span v-if="hasError('serverType')" class="field-error">
                        {{ getErrorForField('serverType') }}
                    </span>
                </div>
                <div class="col span-6">
                    <LabeledSelect
                        v-model:value="serverConfiguration.serverImage"
                        :options="hetznerOptions.serverImages"
                        required
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.server.image.placeholder')"
                        :label="t('driver.hetzner.machine.server.image.label')"
                        :class="{ 'has-error': hasError('serverImage') }"
                    />
                    <span v-if="hasError('serverImage')" class="field-error">
                        {{ getErrorForField('serverImage') }}
                    </span>
                </div>
            </div>
            <div class="row mt-10">
                <div class="col span-12">
                    <LabeledSelect
                        v-model:value="serverConfiguration.placementGroupId"
                        :options="hetznerOptions.placementGroups"
                        clearable
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.server.placementGroup.placeholder')"
                        :label="t('driver.hetzner.machine.server.placementGroup.label')"
                    />
                </div>
            </div>

            <h2 class="mt-30 mb-20">{{ t('driver.hetzner.machine.network.title') }}</h2>

            <Banner
                v-if="networkValidationError"
                color="warning"
                :label="networkValidationError"
            />

            <div class="row mt-10 vcenter">
                <div class="col span-6">
                    <LabeledSelect
                        v-model:value="serverConfiguration.networkIds"
                        :options="hetznerOptions.networks"
                        multiple
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.network.networks.placeholder')"
                        :label="t('driver.hetzner.machine.network.networks.label')"
                        :class="{ 'has-error': hasError('networkIds') }"
                    />
                </div>
                <div class="col span-6">
                    <Checkbox
                        v-model:value="serverConfiguration.usePrivateNetwork"
                        :disabled="isLoading"
                        :label="t('driver.hetzner.machine.network.private.label')"
                        :description="t('driver.hetzner.machine.network.private.description')"
                    />
                </div>
            </div>
            <div class="row mt-20">
                <div class="col span-4">
                    <Checkbox
                        v-model:value="serverConfiguration.disablePublicNetwork"
                        :disabled="isLoading || !serverConfiguration.networkIds?.length"
                        :label="t('driver.hetzner.machine.network.disablePublic.label')"
                        :description="t('driver.hetzner.machine.network.disablePublic.description')"
                    />
                </div>
                <div class="col span-4">
                    <Checkbox
                        v-model:value="serverConfiguration.disablePublicIpv4"
                        :disabled="isLoading || serverConfiguration.disablePublicNetwork"
                        :label="t('driver.hetzner.machine.network.disableIPv4.label')"
                        :description="t('driver.hetzner.machine.network.disableIPv4.description')"
                    />
                </div>
                <div class="col span-4">
                    <Checkbox
                        v-model:value="serverConfiguration.disablePublicIpv6"
                        :disabled="isLoading || serverConfiguration.disablePublicNetwork"
                        :label="t('driver.hetzner.machine.network.disableIPv6.label')"
                        :description="t('driver.hetzner.machine.network.disableIPv6.description')"
                    />
                </div>
            </div>
            <div class="row mt-20 vcenter">
                <div class="col span-6">
                    <LabeledSelect
                        v-model:value="serverConfiguration.firewallIds"
                        :options="hetznerOptions.firewalls"
                        multiple
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.network.firewalls.placeholder')"
                        :label="t('driver.hetzner.machine.network.firewalls.label')"
                    />
                </div>
                <div class="col span-6">
                    <LabeledSelect
                        v-model:value="serverConfiguration.sshKeyId"
                        :options="hetznerOptions.sshKeys"
                        clearable
                        :disabled="isLoading"
                        :loading="isLoading"
                        :placeholder="t('driver.hetzner.machine.network.sshKey.placeholder')"
                        :label="t('driver.hetzner.machine.network.sshKey.label')"
                    />
                </div>
            </div>

            <h2 class="mt-30 mb-20">{{ t('driver.hetzner.machine.additionalConfig.title') }}</h2>
            <div class="row mt-10">
                <div class="col span-12">
                    <h3 class="mb-5">{{ t('driver.hetzner.machine.additionalConfig.userData.label') }}</h3>
                    <div class="description mb-10">
                        {{ t('driver.hetzner.machine.additionalConfig.userData.description') }}
                    </div>
                    <YamlEditor
                        v-model:value="serverConfiguration.additionalUserData"
                        :disabled="isLoading"
                        :placeholder="t('driver.hetzner.machine.additionalConfig.userData.placeholder')"
                        :label="t('driver.hetzner.machine.additionalConfig.userData.label')"
                        :showCodeEditor="true"
                        :scrolling="true"
                    />
                </div>
            </div>
            <div class="row mt-10">
                <div class="col span-12">
                    <KeyValue
                        v-model:value="serverConfiguration.serverLabels"
                        :valueCanBeEmpty="true"
                        :disabled="isLoading"
                        :loading="isLoading"
                        :title="t('driver.hetzner.machine.additionalConfig.labels.label')"
                        :three-columns="false"
                        :titleProtip="t('driver.hetzner.machine.additionalConfig.labels.description')"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.hetzner-config {
    .row.vcenter {
        align-items: center;
    }

    .description {
        font-size: 0.9rem;
        color: var(--input-label);
    }

    .has-error {
        :deep(.labeled-select) {
            border-color: var(--error);
        }
    }

    .field-error {
        display: block;
        color: var(--error);
        font-size: 0.85rem;
        margin-top: 4px;
    }
}
</style>
