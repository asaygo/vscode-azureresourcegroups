/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { nonNullValue, TreeItemIconPath } from "@microsoft/vscode-azext-utils";
import { Extension, extensions, ThemeIcon, Uri } from "vscode";
import { contributesKey } from "../../constants";

export interface ActionGroup {
    id: string;
    title: string;
    icon: string;
}

export interface Action {
    command: string;
}

interface ExtensionManifest {
    contributes: {
        commands: {
            command: string,
            title: string,
            icon?: TreeItemIconPath,
        }[],
        'x-azResources'?: {
            actionGroups?: ActionGroup[];
            actions?: { [id: string]: Action[] };
        }
    }
}

export function getExtensionManifest(id: string): ExtensionManifest {
    return extensions.getExtension(id)?.packageJSON as ExtensionManifest;
}

export function getExtensionResource(id: string, name: string): string {
    const ext = extensions.getExtension(id);
    return Uri.joinPath(nonNullValue(ext).extensionUri, name).fsPath;
}

export function getAzExtManifest(extension: Extension<unknown>): ExtensionManifest['contributes']['x-azResources'] {
    return (extension.packageJSON as ExtensionManifest)?.contributes?.[contributesKey] as ExtensionManifest['contributes']['x-azResources'];
}

export function getExtensionFromGroup(group: ActionGroup): Extension<unknown> | undefined {
    return extensions.all.find((ext) =>
        !!(getAzExtManifest(ext)?.actionGroups?.find((g) => g.id === group.id))
    );
}

export function getCommandIcon(extensionId: string, icon: TreeItemIconPath): TreeItemIconPath {
    if (isThemedIcon(icon)) {
        return {
            dark: getExtensionResource(extensionId, icon.dark),
            light: getExtensionResource(extensionId, icon.light),
        }
    } else if (typeof icon === 'string' && icon?.startsWith('$')) {
        const id = icon.replace('$(', '').replace(')', '');
        return new ThemeIcon(id);
    } else {
        return getExtensionResource(extensionId, icon as string);
    }
}

interface ThemedIcon {
    dark: string;
    light: string;
}

function isThemedIcon(icon: unknown): icon is ThemedIcon {
    return !!((icon as ThemedIcon).light && (icon as ThemedIcon).dark);
}
