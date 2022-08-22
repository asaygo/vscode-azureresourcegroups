/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, nonNullValue } from "@microsoft/vscode-azext-utils";
import { ActionsGroupTreeItem } from "./ActionsGroupTreeItem";
import { Action, getCommandIcon, getExtensionManifest } from "./actionUtils";

export class ActionTreeItem extends AzExtTreeItem {
    public label: string;
    public contextValue: string;

    constructor(parent: ActionsGroupTreeItem, private readonly extensionId: string, action: Action) {
        super(parent);

        const command = this.getCommand(action);
        this.label = command.title;
        this.contextValue = command.command;

        if (command.icon) {
            this.iconPath = getCommandIcon(this.extensionId, command.icon);
        }

        this.commandId = action.command;
        this.commandArgs = [];
    }

    getCommand(action: Action) {
        const manifest = getExtensionManifest(this.extensionId);
        const command = manifest.contributes.commands.find((command) => command.command === action.command);
        return nonNullValue(command);
    }
}
