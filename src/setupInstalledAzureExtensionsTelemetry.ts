/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { getExternalExtensions } from "./utils/extensionUtils";
import { getResourceContributions } from './utils/getResourceContributions';

function getInstalledAzureExtensions(): vscode.Extension<unknown>[] {
    return getExternalExtensions().filter(extension => getResourceContributions(extension));
}

function setInstalledAzureExtensionsTelemetry(context: IActionContext): void {
    const installedAzureExtensions = getInstalledAzureExtensions();
    context.telemetry.properties.installedAzureExtensions = installedAzureExtensions.map(extension => extension.id).sort().join(',');
    context.telemetry.measurements.installedAzureExtensionsCount = installedAzureExtensions.length;
}

function registerOnDidChangeExtensionsEvent(): void {
    function getInstalledAzureExtensionsIds(): string[] {
        return getInstalledAzureExtensions().map(extension => extension.id);
    }

    let installedAzureExtensionsIds = getInstalledAzureExtensionsIds();

    registerEvent('onDidChangeExtensions', vscode.extensions.onDidChange, (context: IActionContext) => {
        context.telemetry.suppressIfSuccessful = true;

        const updatedInstalledAzureExtensionsIds = getInstalledAzureExtensionsIds();

        if (installedAzureExtensionsIds.length < updatedInstalledAzureExtensionsIds.length) {
            // an Azure extension has been installed
            context.telemetry.suppressIfSuccessful = false;
            const newlyInstalledExtensions = updatedInstalledAzureExtensionsIds.filter(id => !installedAzureExtensionsIds.includes(id));
            context.telemetry.properties.installedExtensions = newlyInstalledExtensions.join(',');
        }

        context.telemetry.measurements.oldInstalledAzureExtensionsCount = installedAzureExtensionsIds.length;
        installedAzureExtensionsIds = getInstalledAzureExtensionsIds();
        context.telemetry.measurements.newInstalledAzureExtensionsCount = installedAzureExtensionsIds.length;
    });
}

export function setupAzureExtensionTelemetry(context: IActionContext): void {
    setInstalledAzureExtensionsTelemetry(context);
    registerOnDidChangeExtensionsEvent();
}
