import type { GenericResource, ResourceGroup, ResourceManagementClient } from "@azure/arm-resources";
import { uiUtils } from "@microsoft/vscode-azext-azureutils";
import { IActionContext } from "@microsoft/vscode-azext-utils";
import { AzureSubscription } from "@microsoft/vscode-azext-utils/hostapi.v2";
import { randomUUID } from "crypto";
import { createResourceClient } from "./utils/azureClients";
import { createSubscriptionContext } from "./utils/v2/credentialsUtils";

interface AzureResourcesService {
    listResources(context: IActionContext, subscription: AzureSubscription): Promise<GenericResource[]>;
    listResourceGroups(context: IActionContext, subscription: AzureSubscription): Promise<ResourceGroup[]>;
}

export const defaultAzureResourcesServiceFactory: AzureResourcesServiceFactory = (): AzureResourcesService => {
    async function createClient(context: IActionContext, subscription: AzureSubscription): Promise<ResourceManagementClient> {
        const subContext = createSubscriptionContext(subscription);
        return await createResourceClient([context, subContext]);
    }
    return {
        async listResources(context: IActionContext, subscription: AzureSubscription): Promise<GenericResource[]> {
            const client = await createClient(context, subscription);
            return uiUtils.listAllIterator(client.resources.list());
        },
        async listResourceGroups(context: IActionContext, subscription: AzureSubscription): Promise<ResourceGroup[]> {
            const client = await createClient(context, subscription);
            return uiUtils.listAllIterator(client.resourceGroups.list());
        },
    }
}

export const mockAzureResourcesServiceFactory: AzureResourcesServiceFactory = (): AzureResourcesService => {

    let rgCount = 0;
    function rg(): ResourceGroup {
        rgCount++;
        return {
            location: 'MockLocation',
            name: `mock-rg-${rgCount}`,
            id: `/subscriptions/${randomUUID()}/resourceGroups/mock-rg-${rgCount}`,
            type: 'resourceGroup',
        }
    }

    function func(resourceGroup: ResourceGroup, name: string): GenericResource {
        return {
            id: `${resourceGroup.id}/providers/Microsoft.Web/sites/${name}`,
            name,
            type: 'microsoft.web/sites',
            kind: 'functionapp',
        }
    }

    const resourceGroups: ResourceGroup[] = [
        rg()
    ];

    const resources: GenericResource[] = [
        func(resourceGroups[0], 'my-functionapp-1'),
        func(resourceGroups[0], 'my-functionapp-2'),
        func(resourceGroups[0], 'my-functionapp-3'),
    ];

    return {
        async listResources(): Promise<GenericResource[]> {
            return resources;
        },
        async listResourceGroups(): Promise<ResourceGroup[]> {
            return resourceGroups;
        },
    }
}

export type AzureResourcesServiceFactory = () => AzureResourcesService;
