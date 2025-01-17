/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ResourceModelBase } from '../../../api/src/index';
import { AzureResourceProviderManager } from '../../api/ResourceProviderManagers';
import { showHiddenTypesSettingKey } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from '../../utils/localize';
import { BranchDataItemCache } from '../BranchDataItemCache';
import { GenericItem } from '../GenericItem';
import { ResourceGroupsItem } from '../ResourceGroupsItem';
import { TreeItemStateStore } from '../TreeItemState';
import { AzureResourceGroupingManager } from './AzureResourceGroupingManager';
import { AzureResourceTreeDataProviderBase } from './AzureResourceTreeDataProviderBase';
import { SubscriptionItem } from './SubscriptionItem';
import { createSubscriptionContext } from './VSCodeAuthentication';

export class AzureResourceTreeDataProvider extends AzureResourceTreeDataProviderBase {
    private readonly groupingChangeSubscription: vscode.Disposable;

    constructor(
        onDidChangeBranchTreeData: vscode.Event<void | ResourceModelBase | ResourceModelBase[] | null | undefined>,
        itemCache: BranchDataItemCache,
        state: TreeItemStateStore,
        onRefresh: vscode.Event<void | ResourceGroupsItem | ResourceGroupsItem[] | null | undefined>,
        protected readonly resourceGroupingManager: AzureResourceGroupingManager,
        protected readonly resourceProviderManager: AzureResourceProviderManager) {
        super(
            itemCache,
            onDidChangeBranchTreeData,
            onRefresh,
            state,
            resourceGroupingManager,
            resourceProviderManager,
            () => {
                this.groupingChangeSubscription.dispose();
            });

        registerEvent(
            'treeView.onDidChangeConfiguration',
            vscode.workspace.onDidChangeConfiguration,
            async (context: IActionContext, e: vscode.ConfigurationChangeEvent) => {
                context.errorHandling.suppressDisplay = true;
                context.telemetry.suppressIfSuccessful = true;
                context.telemetry.properties.isActivationEvent = 'true';

                if (e.affectsConfiguration(`${ext.prefix}.${showHiddenTypesSettingKey}`)) {
                    this.notifyTreeDataChanged();
                }
            });

        // TODO: This really belongs on the subscription item, but that then involves disposing of them during refresh,
        //       and I'm not sure of the mechanics of that.  Ideally grouping mode changes shouldn't require new network calls,
        //       as we're just rearranging known items; we might try caching resource items and only calling getTreeItem() on
        //       branch providers during the tree refresh that results from this (rather than getChildren() again).
        this.groupingChangeSubscription = this.resourceGroupingManager.onDidChangeGrouping(() => this.notifyTreeDataChanged());
    }

    async onGetChildren(element?: ResourceGroupsItem | undefined): Promise<ResourceGroupsItem[] | null | undefined> {
        if (element) {
            return await element.getChildren();
        } else {
            const api = await this.getAzureAccountExtensionApi();

            if (api) {
                if (api.status === 'LoggedIn') {
                    if (api.filters.length === 0) {
                        return [new GenericItem(localize('noSubscriptions', 'Select Subscriptions...'), {
                            commandId: 'azureResourceGroups.selectSubscriptions'
                        })]
                    } else {
                        return api.filters.map(
                            subscription => new SubscriptionItem(
                                {
                                    subscription: subscription,
                                    subscriptionContext: createSubscriptionContext(subscription),
                                    refresh: item => this.notifyTreeDataChanged(item),
                                },
                                this.resourceGroupingManager,
                                this.resourceProviderManager,
                                subscription));
                    }
                } else if (api.status === 'LoggedOut') {
                    return [
                        new GenericItem(
                            localize('signInLabel', 'Sign in to Azure...'),
                            {
                                commandId: 'azureResourceGroups.logIn',
                                iconPath: new vscode.ThemeIcon('sign-in')
                            }),
                        new GenericItem(
                            localize('createAccountLabel', 'Create an Azure Account...'),
                            {
                                commandId: 'azureResourceGroups.openUrl',
                                commandArgs: ['https://aka.ms/VSCodeCreateAzureAccount'],
                                iconPath: new vscode.ThemeIcon('add')
                            }),
                        new GenericItem(
                            localize('createStudentAccount', 'Create an Azure for Students Account...'),
                            {
                                commandId: 'azureResourceGroups.openUrl',
                                commandArgs: ['https://aka.ms/student-account'],
                                iconPath: new vscode.ThemeIcon('mortar-board')
                            }),
                    ];
                } else {
                    return [
                        new GenericItem(
                            api.status === 'Initializing'
                                ? localize('loadingTreeItem', 'Loading...')
                                : localize('signingIn', 'Waiting for Azure sign-in...'),
                            {
                                commandId: 'azureResourceGroups.logIn',
                                iconPath: new vscode.ThemeIcon('loading~spin')
                            })
                    ];
                }
            }
        }

        return undefined;
    }
}
