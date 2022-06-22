import * as vscode from 'vscode';
import type { Environment } from '@azure/ms-rest-azure-env';
import { AppResourceFilter } from '@microsoft/vscode-azext-utils/hostapi';
import { AzExtServiceClientCredentials } from '@microsoft/vscode-azext-utils';

/**
 * Information specific to the Subscription
 */
 export interface ApplicationSubscription {
    readonly credentials: AzExtServiceClientCredentials;
    readonly subscriptionId: string;
    readonly environment: Environment;
    readonly isCustomCloud: boolean;
}

export interface ResourceBase {
    readonly id: string;
    readonly name: string;
    readonly type: string;
}

/**
 * Represents an individual resource in Azure.
 * @remarks The `id` property is expected to be the Azure resource ID.
 */
export interface ApplicationResource extends ResourceBase {
    readonly subscription: ApplicationSubscription;
    readonly kind?: string;
    readonly location?: string;
    /** Resource tags */
    readonly tags?: {
        [propertyName: string]: string;
    };
    /* add more properties from GenericResource if needed */
}

export interface ResourceProviderBase<TResource extends ResourceBase> {
    readonly onDidChangeResource?: vscode.Event<TResource | undefined>;
}

export interface ProvideResourceOptions {
    readonly startAt?: number;
    readonly maxResults?: number;
}

export interface ApplicationResourceProvider extends ResourceProviderBase<ApplicationResource> {
    provideResources(subscription: ApplicationSubscription, options?: ProvideResourceOptions): vscode.ProviderResult<ApplicationResource[]>;
}

export interface ResourceQuickPickOptions {
    readonly contexts?: string[];
    readonly isParent?: boolean;
}

export interface ResourceModelBase {
    readonly quickPickOptions?: ResourceQuickPickOptions;
    readonly azureResourceId?: string;
}

/**
 * The interface that resource resolvers must implement
 */
export interface BranchDataProvider<TResource extends ResourceBase, TModel extends ResourceModelBase> extends vscode.TreeDataProvider<TModel> {
    /**
     * Called to get the provider's model element for a specific resource.
     * @remarks getChildren() assumes that the provider passes a known <T> model item, or undefined when getting the root children.
     *          However, we need to be able to pass a specific application resource which may not match the <T> model hierarchy used by the provider.
     */
    getResourceItem(element: TResource): vscode.ProviderResult<TModel>;

    /**
     * (Optional) Called to create a new resource of the type (e.g. via Quick Pick).
     */
    createResourceItem?: () => vscode.ProviderResult<TResource>;
}

/**
 *
 */
export interface WorkspaceResource extends ResourceBase {
    readonly folder: vscode.WorkspaceFolder;
}

/**
 * A provider for supplying items for the workspace resource tree (e.g., storage emulator, function apps in workspace, etc.)
 */
export interface WorkspaceResourceProvider extends ResourceProviderBase<WorkspaceResource> {
    /**
     * Called to supply the tree nodes to the workspace resource tree
     * @param folder A folder in the opened workspace
     */
    provideResources(folder: vscode.WorkspaceFolder, options?: ProvideResourceOptions): vscode.ProviderResult<WorkspaceResource[]>;
}

export interface ResourcePickOptions {
    /**
     * If set to true, the last (and _only_ the last) stage of the tree item picker will show a multi-select quick pick
     */
    canPickMany?: boolean;

     /**
      * If set to false, the 'Create new...' pick will not be displayed.
      * For example, this could be used when the command deletes a tree item.
      */
    canCreate?: boolean;

    /**
     * If set, the picker will call this function to if the user creates a resource.
     * @param create A function that, if called, will create the resource.
     */
    onCreate?: (create: () => Promise<never>) => void;

     /**
      * If set to true, the quick pick dialog will not close when focus moves out. Defaults to `true`.
      */
    ignoreFocusOut?: boolean;

     /**
      * When no item is available for user to pick, this message will be displayed in the error notification.
      * This will also suppress the report issue button.
      */
    noItemFoundErrorMessage?: string;

    /**
     * Options to filter the picks to resources that match any of the provided filters
     */
    filter?: AppResourceFilter | AppResourceFilter[];

     /**
      * Set this to pick a child of the selected app resource
      */
    expectedChildContextValue?: string | RegExp | (string | RegExp)[];

     /**
      * Whether `AppResourceTreeItem`s should be resolved before displaying them as quick picks, or only once one has been selected
      * If a client extension needs to change label/description/something visible on the quick pick via `resolve`, set to true,
      * otherwise set to false. Default will be false.
      */
    resolveQuickPicksBeforeDisplay?: boolean;
}

/**
 * The current (v2) Azure Resources extension API.
 */
export interface V2AzureResourcesApi extends AzureResourcesApiBase {
    /**
     * Show a quick picker of app resources. Set `options.type` to filter the picks.
     */
    pickResource<TModel>(options?: ResourcePickOptions): vscode.ProviderResult<TModel>

    /**
     * Reveals an item in the application/workspace resource tree
     * @param resourceId The ID of the resource to reveal.
     */
    revealResource(resourceId: string): Promise<void>;

    /**
     * Registers an application provider.
     * @param id The provider ID . Must be unique.
     * @param provider The provider.
     */
    registerApplicationResourceProvider(id: string, provider: ApplicationResourceProvider): vscode.Disposable;

    /**
     * Registers an application resource tree data provider factory
     * @param id The resolver ID. Must be unique.
     * @param resolver The resolver
     */
    registerApplicationResourceManager<T>(id: string, provider: BranchDataProvider<ApplicationResource, T>): vscode.Disposable;

    /**
     * Registers a workspace resource provider
     * @param id The provider ID. Must be unique.
     * @param provider The provider
     */
    registerWorkspaceResourceProvider(id: string, provider: WorkspaceResourceProvider): vscode.Disposable;

    /**
     * Registers an application resource tree data provider factory
     * @param id The resolver ID. Must be unique.
     * @param resolver The resolver
     */
    registerWorkspaceResourceManager<T>(id: string, provider: BranchDataProvider<WorkspaceResource, T>): vscode.Disposable;
}

export interface AzureResourcesApiBase {
    readonly apiVersion: string;
}

/**
 * Exported object of the Azure Resources extension.
 */
export interface AzureResourcesApiManager {

    /**
     * Gets a specific version of the Azure Resources extension API.
     *
     * @typeparam T The type of the API.
     * @param version The version of the API to return. Defaults to the latest version.
     *
     * @returns The requested API or undefined, if not available.
     */
    getApi<T extends AzureResourcesApiBase>(versionRange: string): T | undefined
}