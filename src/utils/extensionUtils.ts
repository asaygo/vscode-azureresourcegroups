/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

const builtInExtensionIdRegex = /^vscode\./i;

export function getExternalExtensions(): vscode.Extension<unknown>[] {
    return vscode.extensions
        .all
        // We don't need to look at any built-in extensions (often the majority of them)
        .filter(extension => !builtInExtensionIdRegex.test(extension.id));
}
