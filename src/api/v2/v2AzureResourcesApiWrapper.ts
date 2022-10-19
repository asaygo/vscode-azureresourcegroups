/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtResourceType, callWithTelemetryAndErrorHandlingSync } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ResourceGroupsItem } from '../../tree/v2/ResourceGroupsItem';
import { ApplicationResource, ApplicationResourceProvider, BranchDataProvider, ResourceModelBase, V2AzureResourcesApi, WorkspaceResource, WorkspaceResourceProvider } from './v2AzureResourcesApi';

export class V2AzureResourcesApiWrapper implements V2AzureResourcesApi {
    constructor(
        private readonly api: V2AzureResourcesApi,
        private readonly extensionId: string) {
    }

    get apiVersion(): string {
        return this.api.apiVersion;
    }

    get applicationResourceTreeDataProvider(): vscode.TreeDataProvider<ResourceGroupsItem> {
        return this.api.applicationResourceTreeDataProvider;
    }

    get workspaceResourceTreeDataProvider(): vscode.TreeDataProvider<ResourceGroupsItem> {
        return this.api.workspaceResourceTreeDataProvider;
    }

    revealResource(resourceId: string): Promise<void> {
        return this.callWithTelemetryAndErrorHandlingSync('v2.revealResource', () => this.api.revealResource(resourceId));
    }

    registerApplicationResourceProvider(provider: ApplicationResourceProvider): vscode.Disposable {
        return this.callWithTelemetryAndErrorHandlingSync('v2.registerApplicationResourceProvider', () => this.api.registerApplicationResourceProvider(provider));
    }

    registerApplicationResourceBranchDataProvider<T extends ResourceModelBase>(type: AzExtResourceType, provider: BranchDataProvider<ApplicationResource, T>): vscode.Disposable {
        return this.callWithTelemetryAndErrorHandlingSync('v2.registerApplicationResourceBranchDataProvider', () => this.api.registerApplicationResourceBranchDataProvider(type, provider));
    }

    registerWorkspaceResourceProvider(provider: WorkspaceResourceProvider): vscode.Disposable {
        return this.callWithTelemetryAndErrorHandlingSync('v2.registerWorkspaceResourceProvider', () => this.api.registerWorkspaceResourceProvider(provider));
    }

    registerWorkspaceResourceBranchDataProvider<T extends ResourceModelBase>(id: string, provider: BranchDataProvider<WorkspaceResource, T>): vscode.Disposable {
        return this.callWithTelemetryAndErrorHandlingSync('v2.registerWorkspaceResourceBranchDataProvider', () => this.api.registerWorkspaceResourceBranchDataProvider<T>(id, provider));
    }

    private callWithTelemetryAndErrorHandlingSync<T>(callbackId: string, func: () => T): T {
        const response = callWithTelemetryAndErrorHandlingSync(
            callbackId,
            context => {
                context.telemetry.properties.callingExtensionId = this.extensionId;
                context.errorHandling.rethrow = true;
                context.errorHandling.suppressDisplay = true;
                context.errorHandling.suppressReportIssue = true;

                return func();
            });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return response!;
    }
}