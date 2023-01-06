import { AzureResource, AzureResourcesApi, AzureResourcesHostApi, AzureSubscription, ResourceProvider } from "@microsoft/vscode-azext-utils/hostapi.v2";
import * as vscode from 'vscode';

/**
* A provider for supplying items for the Azure resource tree (e.g. Cosmos DB, Storage, etc.).
*/
type AzureResourceProvider = ResourceProvider<AzureSubscription, AzureResource>;

/**
 * v2 types that are internal to resource groups (for now)
*/
export interface AzureResourcesApiInternal extends AzureResourcesApi {
    resources: AzureResourcesHostApi & {
        /**
         * Registers a provider of Azure resources.
         *
         * @param provider The resource provider.
         *
         * @returns A disposable that unregisters the provider when disposed.
         */
        registerAzureResourceProvider(provider: AzureResourceProvider): vscode.Disposable;
    };
}
