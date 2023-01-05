import { IActionContext } from "@microsoft/vscode-azext-utils";
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

/**
 * `AzureResourcesApiInternal` with an `IActionContext` parameter prepended to all functions.
 */
export type AzureResourcesApiWithContext = ApiWithContext<AzureResourcesApiInternal>;

type FunctionWithContextPrepended<T extends (...args: unknown[]) => unknown> = (context: IActionContext, ...args: Parameters<T>) => ReturnType<T>;

type ApiFunctionsWithContextParam<T> = {
    [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? FunctionWithContextPrepended<T[K]> : T[K];
}

type ApiWithContext<T> = {
    [K in keyof T]: ApiFunctionsWithContextParam<T[K]>;
}
