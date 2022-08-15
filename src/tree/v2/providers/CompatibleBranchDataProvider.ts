/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeDataProvider, AzExtTreeItem, IFindTreeItemContext, ITreeItemPickerContext } from '@microsoft/vscode-azext-utils';
import { AppResource, AppResourceResolver } from '@microsoft/vscode-azext-utils/hostapi';
import * as vscode from 'vscode';
import { ApplicationResource, BranchDataProvider, ResourceModelBase } from '../../../api/v2/v2AzureResourcesApi';

export class CompatibleBranchDataProvider<TResource extends ApplicationResource, TModel extends AzExtTreeItem & ResourceModelBase> extends AzExtTreeDataProvider implements BranchDataProvider<TResource, TModel> {
    private readonly overrideOnDidChangeTreeDataEmitter = new vscode.EventEmitter<TModel | undefined>();

    public constructor(private readonly resolver: AppResourceResolver, loadMoreCommandId: string) {
        super(undefined as unknown as AzExtParentTreeItem, loadMoreCommandId);
    }

    //#region TreeDataProvider

    public override readonly onDidChangeTreeData = this.overrideOnDidChangeTreeDataEmitter.event;

    public override getParent(treeItem: TModel): Promise<TModel> {
        // This method is redeclared to make TypeScript happier, but it's no more than a super call with extra casts
        return super.getParent(treeItem) as Promise<TModel>;
    }

    public override getChildren(treeItem: TModel & AzExtParentTreeItem): Promise<TModel[]> {
        // This method is redeclared to make TypeScript happier, but it's no more than a super call with extra casts
        return super.getChildren(treeItem) as Promise<TModel[]>;
    }

    //#endregion

    //#region BranchDataProvider

    public async getResourceItem(element: TResource): Promise<TModel> {
        const oldAppResource: AppResource = {
            ...element,
            type: element.type.type,
            kind: element.type.kinds?.join(';'),
        };

        return this.resolver.resolveResource(/* TODO */'foo', oldAppResource) as Promise<TModel>;
    }

    //#endregion BranchDataProvider

    //#region AzExtTreeDataProvider

    public override refreshUIOnly(treeItem?: TModel): void {
        // Override the default behavior to remain scoped to specific elements, like it ought
        // And also, use overrideOnDidChangeTreeDataEmitter
        this.overrideOnDidChangeTreeDataEmitter.fire(treeItem);
    }

    public override async showTreeItemPicker<T extends AzExtTreeItem>(expectedContextValues: string | RegExp | (string | RegExp)[], context: ITreeItemPickerContext & { canPickMany: true; }, startingTreeItem?: AzExtTreeItem): Promise<T[]>;
    public override async showTreeItemPicker<T extends AzExtTreeItem>(_expectedContextValues: string | RegExp | (string | RegExp)[], _context: ITreeItemPickerContext, _startingTreeItem?: AzExtTreeItem): Promise<T> {
        throw new Error('Use the Resources extension API to do showTreeItemPicker');
    }

    public override async findTreeItem<T extends AzExtTreeItem>(_fullId: string, _context: IFindTreeItemContext): Promise<T | undefined> {
        throw new Error('Use the Resources extension API to do findTreeItem');
    }

    // TODO: this (probably?) shouldn't remain in the code we release, but will be helpful in testing to ensure we never access the root
    // @ts-expect-error TypeScript is unhappy that we're overriding something that it doesn't know is secretly on the base class
    private override get _rootTreeItem(): AzExtParentTreeItem {
        throw new Error('The root tree item should not be accessed in a BranchDataProvider');
    }

    //#endregion AzExtTreeDataProvider
}