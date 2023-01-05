/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtResourceType, IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureResource, BranchDataProvider, ResourceModelBase, VSCodeRevealOptions, WorkspaceResource, WorkspaceResourceProvider } from '@microsoft/vscode-azext-utils/hostapi.v2';
import * as vscode from 'vscode';
import { AzureResourceProvider, AzureResourcesApiWithContext } from '../../../hostapi.v2.internal';
import { revealResource } from '../../commands/revealResource';
import { AzureResourceBranchDataProviderManager } from '../../tree/v2/azure/AzureResourceBranchDataProviderManager';
import { AzureResourceTreeDataProvider } from '../../tree/v2/azure/AzureResourceTreeDataProvider';
import { WorkspaceResourceBranchDataProviderManager } from '../../tree/v2/workspace/WorkspaceResourceBranchDataProviderManager';
import { WorkspaceResourceTreeDataProvider } from '../../tree/v2/workspace/WorkspaceResourceTreeDataProvider';
import { AzureResourceProviderManager, WorkspaceResourceProviderManager } from './ResourceProviderManagers';

export function createAzureResourcesHostApi(
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
