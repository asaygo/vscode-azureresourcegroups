/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GenericResource, ResourceGroup } from '@azure/arm-resources';
import { getResourceGroupFromId } from "@microsoft/vscode-azext-azureutils";
import { callWithTelemetryAndErrorHandling, getAzExtResourceType, IActionContext, nonNullProp } from '@microsoft/vscode-azext-utils';
import { AzureResource, AzureSubscription } from '@microsoft/vscode-azext-utils/hostapi.v2';
import * as vscode from 'vscode';
import { AzureResourceProvider } from '../../../hostapi.v2.internal';
import { AzureResourcesServiceFactory } from '../../AzureService';

export class DefaultAzureResourceProvider implements AzureResourceProvider {
    private readonly onDidChangeResourceEmitter = new vscode.EventEmitter<AzureResource | undefined>();

    constructor(private readonly azureResourceServiceFactory: AzureResourcesServiceFactory) { }

    getResources(subscription: AzureSubscription): Promise<AzureResource[] | undefined> {
        return callWithTelemetryAndErrorHandling('provideResources', async (context: IActionContext) => {
            const azureResourcesService = this.azureResourceServiceFactory();
            const allResources: GenericResource[] = await azureResourcesService.listResources(context, subscription);
            const appResources = allResources.map(resource => this.createAppResource(subscription, resource));

            const allResourceGroups: ResourceGroup[] = await azureResourcesService.listResourceGroups(context, subscription);
            const appResourcesResourceGroups = allResourceGroups.map(resource => this.fromResourceGroup(subscription, resource));

            return appResources.concat(appResourcesResourceGroups);
        });
    }

    onDidChangeResource = this.onDidChangeResourceEmitter.event;

    private fromResourceGroup(subscription: AzureSubscription, resourceGroup: ResourceGroup): AzureResource {
        return {
            ...resourceGroup,
            subscription,
            id: nonNullProp(resourceGroup, 'id'),
            name: nonNullProp(resourceGroup, 'name'),
            azureResourceType: {
                type: nonNullProp(resourceGroup, 'type').toLowerCase()
            },
            raw: resourceGroup,
        };
    }

    private createAppResource(subscription: AzureSubscription, resource: GenericResource): AzureResource {
        const resourceId = nonNullProp(resource, 'id');

        return {
            ...resource,
            subscription,
            id: resourceId,
            name: nonNullProp(resource, 'name'),
            azureResourceType: {
                type: nonNullProp(resource, 'type').toLowerCase(),
                kinds: resource.kind?.split(',')?.map(kind => kind.toLowerCase()),
            },
            resourceGroup: getResourceGroupFromId(resourceId),
            location: resource.location,
            resourceType: getAzExtResourceType({
                type: nonNullProp(resource, 'type'),
                kind: resource.kind
            }),
            raw: resource,
        };
    }
}
