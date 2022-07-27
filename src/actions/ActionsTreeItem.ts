/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, IGenericTreeItemOptions } from "@microsoft/vscode-azext-utils";
import { Disposable, ThemeIcon } from "vscode";
import { ext } from "../extensionVariables";
import { ActionTreeItem } from "./ActionTreeItem";

export class ActionsTreeItem extends AzExtParentTreeItem implements Disposable {

    constructor() {
        super(undefined);
    }

    public label: string;
    public contextValue: string;

    private _filter: string | undefined;

    private _favorites: AzExtTreeItem[] = [];

    public async filter(context: IActionContext, value: string, displayName: string): Promise<void> {
        ext.actionsTreeView.description = displayName;
        this._filter = value;
        await this.refresh(context);
    }

    public async favorite(context: IActionContext, item: ActionTreeItem): Promise<void> {
        const options: IGenericTreeItemOptions = {
            label: item.label,
            contextValue: 'favorite',
            commandId: item.commandId,
            iconPath: item.iconPath,
        }

        this._favorites.push(new ActionTreeItem(this, Object.assign({}, options)));

        if (this._filter === 'favorites') {
            await this.refresh(context);
        }
    }

    public async loadMoreChildrenImpl(_clearCache: boolean, _context: IActionContext): Promise<AzExtTreeItem[]> {

        if (this._filter === 'functionapp') {
            return [
                new ActionTreeItem(this, {
                    label: 'Deploy to Function App',
                    contextValue: 'action;deployFunc',
                    commandId: 'azureFunctions.deploy',
                    iconPath: new ThemeIcon('cloud-upload')
                }),
                new ActionTreeItem(this, {
                    label: 'Create New Functions Project',
                    contextValue: 'action;createFuncProject',
                    commandId: 'azureFunctions.deploy',
                    iconPath: new ThemeIcon('add')
                })
            ];
        }
        if (this._filter === 'webApps') {
            return [
                new ActionTreeItem(this, {
                    label: 'Deploy to Web App',
                    contextValue: 'action;deployWebApp',
                    commandId: 'appService.Deploy',
                    iconPath: new ThemeIcon('cloud-upload')
                }),
            ];
        }
        if (this._filter === 'staticWebApps') {
            return [
                new ActionTreeItem(this, {
                    label: 'Create HTTP Function',
                    contextValue: 'action;world',
                    iconPath: new ThemeIcon('add')
                }),
            ];
        }
        if (this._filter === 'favorites') {
            return this._favorites;
        }

        return [];
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public dispose(): void {
        return;
    }
}
