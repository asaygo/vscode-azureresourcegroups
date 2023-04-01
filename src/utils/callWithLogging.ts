/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../extensionVariables";

export async function callWithLogging<T>(callbackId: string, callback: (context: IActionContext) => T | PromiseLike<T>): Promise<T | undefined> {
    ext.outputChannel.trace(`${callbackId} called`);
    const startMs = Date.now();
    const result = await callWithTelemetryAndErrorHandling(callbackId, callback);
    const endMs = Date.now();
    ext.outputChannel.trace(`${callbackId} finished in ${endMs - startMs}ms`);
    return result;
}
