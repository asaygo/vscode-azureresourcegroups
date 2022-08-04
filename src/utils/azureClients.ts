/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as coreAuth from '@azure/core-auth';
import { ResourceManagementClient, ResourceManagementClientOptionalParams } from '@azure/arm-resources';
import { AzExtClientContext, createAzureClient, parseClientContext } from '@microsoft/vscode-azext-azureutils';
import { createDefaultHttpClient, HttpClient, PipelineRequest, PipelineResponse } from '@azure/core-rest-pipeline';
import { ext } from "../extensionVariables";

// Lazy-load @azure packages to improve startup performance.
// NOTE: The client is the only import that matters, the rest of the types disappear when compiled to JavaScript

class LoggingHttpClient implements HttpClient {
    constructor(private readonly innerClient: HttpClient) {
    }

    async sendRequest(httpRequest: PipelineRequest): Promise<PipelineResponse> {
        ext.outputChannel.appendLine(`Azure SDK: ${httpRequest.method} ${httpRequest.url}...`);

        try {
            const response = await this.innerClient.sendRequest(httpRequest);

            ext.outputChannel.appendLine(`Azure SDK: ${httpRequest.method} ${httpRequest.url} response: ${response.status}`);

            return response;
        } catch (error) {
            ext.outputChannel.appendLine(`Azure SDK: ${httpRequest.method} ${httpRequest.url} failed: ${error}`);

            throw error;
        }
    }
}

class AzureResourceGroupManagementClient extends ResourceManagementClient {
    constructor(credentials: coreAuth.TokenCredential, subscriptionId: string, options?: ResourceManagementClientOptionalParams | undefined) {
        options = { httpClient: new LoggingHttpClient(createDefaultHttpClient()), ...options};

        super(credentials, subscriptionId, options);
    }
}

export async function createResourceClient(context: AzExtClientContext): Promise<ResourceManagementClient> {
    if (parseClientContext(context).isCustomCloud) {
        return <ResourceManagementClient><unknown>createAzureClient(context, (await import('@azure/arm-resources-profile-2020-09-01-hybrid')).ResourceManagementClient);
    } else {
        return createAzureClient(context, AzureResourceGroupManagementClient);
    }
}
