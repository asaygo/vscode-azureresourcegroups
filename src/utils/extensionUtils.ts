/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

const builtInExtensionIdRegex = /^vscode\./i;

/**
 * @returns All extensions that are not built-in
 */
export function getExternalExtensions(): vscode.Extension<unknown>[] {
    return vscode.extensions
        .all
        // exclude built-in extensions
        .filter(extension => !builtInExtensionIdRegex.test(extension.id));
}
