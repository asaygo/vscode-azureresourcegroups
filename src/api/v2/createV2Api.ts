/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtResourceType, IActionContext } from '@microsoft/vscode-azext-utils';
import { Activity } from '@microsoft/vscode-azext-utils/hostapi';
import { AzureResource, BranchDataProvider, ResourceModelBase, VSCodeRevealOptions, WorkspaceResource, WorkspaceResourceProvider } from '@microsoft/vscode-azext-utils/hostapi.v2';
import * as vscode from 'vscode';
import { AzureResourceProvider, AzureResourcesApiInternal } from '../../../hostapi.v2.internal';
import { registerActivity } from "../../activityLog/registerActivity";
import { revealResource } from '../../commands/revealResource';
import { AzureResourceBranchDataProviderManager } from "../../tree/v2/azure/AzureResourceBranchDataProviderManager";
import { AzureResourceTreeDataProvider } from "../../tree/v2/azure/AzureResourceTreeDataProvider";
import { WorkspaceResourceBranchDataProviderManager } from "../../tree/v2/workspace/WorkspaceResourceBranchDataProviderManager";
import { WorkspaceResourceTreeDataProvider } from "../../tree/v2/workspace/WorkspaceResourceTreeDataProvider";
import { AzureResourceProviderManager, WorkspaceResourceProviderManager } from "./ResourceProviderManagers";

export function createV2Api(
    azureResourceProviderManager: AzureResourceProviderManager,
    azureResourceBranchDataProviderManager: AzureResourceBranchDataProviderManager,
    azureResourceTreeDataProvider: AzureResourceTreeDataProvider,
    workspaceResourceProviderManager: WorkspaceResourceProviderManager,
    workspaceResourceBranchDataProviderManager: WorkspaceResourceBranchDataProviderManager,
    workspaceResourceTreeDataProvider: WorkspaceResourceTreeDataProvider
): AzureResourcesApiWithContext {
    return {
        apiVersion: '2.0.0',
        activity: {
            registerActivity: (_context: IActionContext, activity: Activity) => registerActivity(activity),
        },
        resources: createResourcesApi(
            azureResourceProviderManager,
            azureResourceBranchDataProviderManager,
            azureResourceTreeDataProvider,
            workspaceResourceProviderManager,
            workspaceResourceBranchDataProviderManager,
            workspaceResourceTreeDataProvider
        ),
    }
}

/**
 * `AzureResourcesApiInternal` with an `IActionContext` parameter prepended to all functions.
 */
export type AzureResourcesApiWithContext = PrependContextParamToApi<AzureResourcesApiInternal>;

/**
 * Adds an `IActionContext` parameter to the beginning of a function's parameter list.
 */
type PrependContextParam<T extends (...args: unknown[]) => unknown> = (context: IActionContext, ...args: Parameters<T>) => ReturnType<T>;

type ApiFunctionsWithContextParam<T> = {
    [K in keyof T]: T[K] extends (...args: unknown[]) => unknown ? PrependContextParam<T[K]> : T[K];
}

type PrependContextParamToApi<T> = {
    [K in keyof T]: ApiFunctionsWithContextParam<T[K]>;
}

export function createResourcesApi(
    azureResourceProviderManager: AzureResourceProviderManager,
    azureResourceBranchDataProviderManager: AzureResourceBranchDataProviderManager,
    azureResourceTreeDataProvider: AzureResourceTreeDataProvider,
    workspaceResourceProviderManager: WorkspaceResourceProviderManager,
    workspaceResourceBranchDataProviderManager: WorkspaceResourceBranchDataProviderManager,
    workspaceResourceTreeDataProvider: WorkspaceResourceTreeDataProvider): AzureResourcesApiWithContext['resources'] {

    return {
        azureResourceTreeDataProvider,
        workspaceResourceTreeDataProvider,

        registerAzureResourceProvider: (_context: IActionContext, provider: AzureResourceProvider) => {
            azureResourceProviderManager.addResourceProvider(provider);
            return new vscode.Disposable(() => azureResourceProviderManager.removeResourceProvider(provider));
        },
        registerAzureResourceBranchDataProvider: <T extends ResourceModelBase>(_context: IActionContext, type: AzExtResourceType, provider: BranchDataProvider<AzureResource, T>) => {
            azureResourceBranchDataProviderManager.addProvider(type, provider);
            return new vscode.Disposable(() => azureResourceBranchDataProviderManager.removeProvider(type));
        },

        registerWorkspaceResourceProvider: (_context: IActionContext, provider: WorkspaceResourceProvider) => {
            workspaceResourceProviderManager.addResourceProvider(provider);
            return new vscode.Disposable(() => workspaceResourceProviderManager.removeResourceProvider(provider));
        },
        registerWorkspaceResourceBranchDataProvider: <T extends ResourceModelBase>(_context: IActionContext, type: string, provider: BranchDataProvider<WorkspaceResource, T>) => {
            workspaceResourceBranchDataProviderManager.addProvider(type, provider);
            return new vscode.Disposable(() => workspaceResourceBranchDataProviderManager.removeProvider(type));
        },

        revealAzureResource: (context: IActionContext, id: string, options?: VSCodeRevealOptions) => {
            return revealResource(context, id, options);
        },
    }
}
