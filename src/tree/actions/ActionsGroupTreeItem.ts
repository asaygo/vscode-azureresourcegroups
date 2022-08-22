/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { extensions, TreeItemCollapsibleState } from "vscode";
import { ActionsTreeItem } from "./ActionsTreeItem";
import { ActionTreeItem } from "./ActionTreeItem";
import { Action, ActionGroup, getAzExtManifest, getExtensionResource } from "./actionUtils";

export class ActionsGroupTreeItem extends AzExtParentTreeItem {

    public get collapsibleState(): TreeItemCollapsibleState | undefined {
        return TreeItemCollapsibleState.Expanded;
    }

    constructor(parent: ActionsTreeItem, private readonly group: ActionGroup, private readonly extensionId: string) {
        super(parent);

        this.label = group.title;
        this.iconPath = getExtensionResource(this.extensionId, group.icon);
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        return this.getActions().map((action) => new ActionTreeItem(this, this.extensionId, action));
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public label: string;
    public contextValue: string;


    private getActions(): Action[] {

        const actions: Action[] = [];

        extensions.all.forEach((ext) => actions.push(...(getAzExtManifest(ext)?.actions?.[this.group.id] ?? [])))

        return actions;
    }
}
