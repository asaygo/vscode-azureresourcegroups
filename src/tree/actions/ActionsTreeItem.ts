/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, nonNullValueAndProp } from "@microsoft/vscode-azext-utils";
import { Disposable, extensions } from "vscode";
import { ActionsGroupTreeItem } from "./ActionsGroupTreeItem";
import { ActionGroup, getAzExtManifest, getExtensionFromGroup } from "./actionUtils";

export class ActionsTreeItem extends AzExtParentTreeItem implements Disposable {
    public label: string;
    public contextValue: string;

    constructor() {
        super(undefined);
    }

    dispose(): void {
        return;
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {
        const groups = this.getActionGroups();
        return groups.map((group) => {
            const ext = getExtensionFromGroup(group);
            return new ActionsGroupTreeItem(this, group, nonNullValueAndProp(ext, 'id'));
        })
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    private getActionGroups(): ActionGroup[] {
        const groups: ActionGroup[] = [];
        extensions.all.forEach((ext) => {
            groups.push(...(getAzExtManifest(ext)?.actionGroups ?? []));
        });
        return groups;
    }

}
