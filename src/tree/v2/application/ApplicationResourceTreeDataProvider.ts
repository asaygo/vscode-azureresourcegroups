/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import type { Environment } from '@azure/ms-rest-azure-env';
import * as vscode from 'vscode';
import { ApplicationResourceProviderManager } from '../../../api/v2/ResourceProviderManagers';
import { AzureSubscriptionProvider, AzureSubscriptionStatus } from '../../../api/v2/subscriptions/AzureSubscriptionProvider';
import { ResourceModelBase } from '../../../api/v2/v2AzureResourcesApi';
import { showHiddenTypesSettingKey } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../utils/localize';
import { GenericItem } from '../GenericItem';
import { ResourceGroupsItem } from '../ResourceGroupsItem';
import { ResourceGroupsItemCache } from '../ResourceGroupsItemCache';
import { ResourceTreeDataProviderBase } from '../ResourceTreeDataProviderBase';
import { ApplicationResourceGroupingManager } from './ApplicationResourceGroupingManager';
import { SubscriptionItem } from './SubscriptionItem';
import { createSubscriptionContext } from '../../../utils/v2/credentialsUtils';

export class ApplicationResourceTreeDataProvider extends ResourceTreeDataProviderBase {
    private readonly groupingChangeSubscription: vscode.Disposable;
    private readonly subscriptionsSubscription: vscode.Disposable;

    constructor(
        onDidChangeBranchTreeData: vscode.Event<void | ResourceModelBase | ResourceModelBase[] | null | undefined>,
        itemCache: ResourceGroupsItemCache,
        onRefresh: vscode.Event<void>,
        private readonly resourceGroupingManager: ApplicationResourceGroupingManager,
        private readonly resourceProviderManager: ApplicationResourceProviderManager,
        private readonly subscriptionProvider: AzureSubscriptionProvider) {
        super(
            itemCache,
            onDidChangeBranchTreeData,
            resourceProviderManager.onDidChangeResourceChange,
            onRefresh,
            () => {
                this.groupingChangeSubscription.dispose();
                this.subscriptionsSubscription.dispose();
            });

        this.subscriptionsSubscription = this.subscriptionProvider.onSubscriptionsChanged(() => this.onDidChangeTreeDataEmitter.fire());

        registerEvent(
            'treeView.onDidChangeConfiguration',
            vscode.workspace.onDidChangeConfiguration,
            async (context: IActionContext, e: vscode.ConfigurationChangeEvent) => {
                context.errorHandling.suppressDisplay = true;
                context.telemetry.suppressIfSuccessful = true;
                context.telemetry.properties.isActivationEvent = 'true';

                if (e.affectsConfiguration(`${ext.prefix}.${showHiddenTypesSettingKey}`)) {
                    this.onDidChangeTreeDataEmitter.fire();
                }
            });

        // TODO: This really belongs on the subscription item, but that then involves disposing of them during refresh,
        //       and I'm not sure of the mechanics of that.  Ideally grouping mode changes shouldn't require new network calls,
        //       as we're just rearranging known items; we might try caching resource items and only calling getTreeItem() on
        //       branch providers during the tree refresh that results from this (rather than getChildren() again).
        this.groupingChangeSubscription = this.resourceGroupingManager.onDidChangeGrouping(() => this.onDidChangeTreeDataEmitter.fire());
    }

    async onGetChildren(element?: ResourceGroupsItem | undefined): Promise<ResourceGroupsItem[] | null | undefined> {
        if (element) {
            return await element.getChildren();
        } else {
            const subscriptionsResult = await this.subscriptionProvider.getSubscriptions();

            if (subscriptionsResult.status === AzureSubscriptionStatus.LoggedIn) {
                if (subscriptionsResult.selectedSubscriptions.length === 0) {
                    return [new GenericItem(localize('noSubscriptions', 'Select Subscriptions...'), { commandId: 'azure-account.selectSubscriptions' })]
                } else {
                    // TODO: This needs to be environment-specific (in terms of default scopes).
                    const session = await vscode.authentication.getSession('microsoft', ['https://management.azure.com/.default', 'offline_access'], { createIfNone: true });

                    return subscriptionsResult.selectedSubscriptions.map(
                        subscription => {
                            const s = {
                                authentication: {
                                    getSession: () => session
                                },
                                displayName: subscription.displayName,
                                environment: {} as Environment /* TODO */,
                                isCustomCloud: false /* TODO */,
                                subscriptionId: subscription.id,
                            };

                            return new SubscriptionItem(
                            {
                                subscriptionContext: createSubscriptionContext(s),
                                getParent: item => this.itemCache.getParentForItem(item),
                                refresh: item => this.onDidChangeTreeDataEmitter.fire(item),
                            },
                            this.resourceGroupingManager,
                            this.resourceProviderManager,
                            s)
                        });
                }
            } else if (subscriptionsResult.status === AzureSubscriptionStatus.LoggedOut) {
                return [
                    new GenericItem(
                        localize('signInLabel', 'Sign in to Azure...'),
                        {
                            commandId: 'azure-account.login',
                            iconPath: new vscode.ThemeIcon('sign-in')
                        }),
                    new GenericItem(
                        localize('createAccountLabel', 'Create an Azure Account...'),
                        {
                            commandId: 'azure-account.createAccount',
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
                        subscriptionsResult.status === AzureSubscriptionStatus.Initializing
                            ? localize('loadingTreeItem', 'Loading...')
                            : localize('signingIn', 'Waiting for Azure sign-in...'),
                        {
                            commandId: 'azure-account.login',
                            iconPath: new vscode.ThemeIcon('loading~spin')
                        })
                ];
            }
        }

        return undefined;
    }
}
