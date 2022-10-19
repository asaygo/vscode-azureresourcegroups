/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../utils/localize';
import { ResourceGroupsItem } from './ResourceGroupsItem';

export class ResourceGroupsItemCache {
    private readonly branchItemToItemCache: Map<unknown, ResourceGroupsItem> = new Map();
    private readonly itemToBranchItemCache: Map<ResourceGroupsItem, unknown> = new Map();
    private readonly itemToChildrenCache: Map<ResourceGroupsItem, ResourceGroupsItem[]> = new Map();
    private readonly itemToParentCache: Map<ResourceGroupsItem, ResourceGroupsItem> = new Map();
    private readonly rootItemCache: ResourceGroupsItem[] = [];

    addBranchItem(branchItem: unknown, item: ResourceGroupsItem): void {
        this.branchItemToItemCache.set(branchItem, item);
        this.itemToBranchItemCache.set(item, branchItem);
    }

    addRootItem(item: ResourceGroupsItem, children: ResourceGroupsItem[]): void {
        this.rootItemCache.push(item);
        this.itemToChildrenCache.set(item, children);
        children.forEach(child => this.itemToParentCache.set(child, item));
    }

    evictAll(): void {
        this.branchItemToItemCache.clear();
        this.itemToBranchItemCache.clear();
        this.itemToChildrenCache.clear();
        this.itemToParentCache.clear();
        this.rootItemCache.length = 0;
    }

    evictItemChildren(item: ResourceGroupsItem): void {
        // Get initial set of children to process...
        const children = this.itemToChildrenCache.get(item);

        if (children) {
            // Remove set (as we modify the set in place)...
            this.itemToChildrenCache.delete(item);

            // Remove each child from the cache...
            while (true) {
                const child = children?.pop();

                // Stop when we're out of children...
                if (!child) {
                    break;
                }

                // Get the children of the current child (i.e. the grandchildren)...
                const grandChildren = this.itemToChildrenCache.get(child);

                // Add any granchildren to the set of children to process...
                grandChildren?.forEach(grandChild => children.push(grandChild));

                //
                // Remove the child from all the caches...
                //

                const branchItem = this.itemToBranchItemCache.get(child);

                if (branchItem) {
                    this.branchItemToItemCache.delete(branchItem);
                }

                this.itemToBranchItemCache.delete(child);
                this.itemToChildrenCache.delete(child);
                this.itemToParentCache.delete(child);
            }
        }
    }

    getItemForBranchItem(branchItem: unknown): ResourceGroupsItem | undefined {
        return this.branchItemToItemCache.get(branchItem);
    }

    getParentForItem(item: ResourceGroupsItem): ResourceGroupsItem | undefined {
        return this.itemToParentCache.get(item);
    }

    getPathForItem(item: ResourceGroupsItem): string[] {
        const path: string[] = [];

        let currentItem: ResourceGroupsItem | undefined = item;

        while (currentItem) {
            path.push(currentItem.id);
            currentItem = this.getParentForItem(currentItem);
        }

        return path.reverse();
    }

    getItemForPath(path: string[]): ResourceGroupsItem | undefined {
        if (path.length === 0) {
            throw new Error(localize('tree.ResourceGroupsItemCache.getItemForPath.invalidPathLength', 'Path must have at least one element.'));
        }

        let currentItem = this.rootItemCache.find(item => item.id === path[0]);

        for (let i = 1; currentItem && i < path.length; i++) {
            const children = this.itemToChildrenCache.get(currentItem);

            currentItem = children?.find(item => item.id === path[i]);
        }

        return currentItem;
    }

    updateItemChildren(item: ResourceGroupsItem, children: ResourceGroupsItem[]): void {
        this.itemToChildrenCache.set(item, children);
        children.forEach(child => this.itemToParentCache.set(child, item));
    }
}