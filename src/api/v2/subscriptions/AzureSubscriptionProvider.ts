import * as arm from '@azure/arm-subscriptions';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { settingUtils } from '../../../utils/settingUtils';
import * as vscode from 'vscode';

export interface AzureSubscription {
    readonly displayName: string;
    readonly id: string;

    getSession(scopes?: string[]): vscode.ProviderResult<vscode.AuthenticationSession>;
}

export enum AzureSubscriptionStatus {
    Initializing,
    LoggedOut,
    SigningIn,
    LoggedIn
}

export type AzureSubscriptionsResult = {
    readonly status: AzureSubscriptionStatus.Initializing | AzureSubscriptionStatus.LoggedOut | AzureSubscriptionStatus.SigningIn;
} | {
    readonly status: AzureSubscriptionStatus.LoggedIn;

    readonly allSubscriptions: AzureSubscription[];
    readonly selectedSubscriptions: AzureSubscription[];
}

export interface AzureSubscriptionProvider {
    getSubscriptions(): Promise<AzureSubscriptionsResult>;

    logIn(): Promise<void>;
    logOut(): Promise<void>;
    selectSubscriptions(subscriptionIds: string[] | undefined): Promise<void>;

    onSubscriptionsChanged: vscode.Event<void>;
}

export class VSCodeAzureSubscriptionProvider extends vscode.Disposable implements AzureSubscriptionProvider {
    private readonly _onSubscriptionsChanged = new vscode.EventEmitter<void>();

    constructor(private readonly storage: vscode.Memento) {
        super(() => this._onSubscriptionsChanged.dispose());
    }

    async getSubscriptions(): Promise<AzureSubscriptionsResult> {
        if (!this.isLoggedIn()) {
            return { status: AzureSubscriptionStatus.LoggedOut };
        }

        let session: vscode.AuthenticationSession | undefined = undefined;

        const client: arm.SubscriptionClient = new arm.SubscriptionClient(
            {
                async getToken(scopes) {
                    scopes = Array.isArray(scopes) ? scopes : [scopes];
                    session = await vscode.authentication.getSession('microsoft', scopes, { createIfNone: true });

                    return {
                        token: session.accessToken,
                        expiresOnTimestamp: 0
                    };
                },
            },
            {
                // baseUri: 'https://management.azure.com/.default'
            });

        const l = await uiUtils.listAllIterator(client.subscriptions.list());

        const allSubscriptions = l.map(s => ({ displayName: s.displayName ?? 'name', id: s.subscriptionId ?? 'id', getSession: () => session }));

        const selectedSubscriptionIds = settingUtils.getGlobalSetting<string[] | undefined>('selectedSubscriptions');
        const selectedSubscriptions = allSubscriptions.filter(s => selectedSubscriptionIds === undefined || selectedSubscriptionIds.includes(s.id));

        return {
            status: session ? AzureSubscriptionStatus.LoggedIn : AzureSubscriptionStatus.LoggedOut,
            allSubscriptions,
            selectedSubscriptions
        };
    }

    async logIn(): Promise<void> {
        await this.storage.update('isLoggedIn', true);

        this._onSubscriptionsChanged.fire();
    }

    async logOut(): Promise<void> {
        await this.storage.update('isLoggedIn', false);

        this._onSubscriptionsChanged.fire();
    }

    async selectSubscriptions(subscriptionIds: string[] | undefined): Promise<void> {
        await settingUtils.updateGlobalSetting<string[] | undefined>('selectedSubscriptions', subscriptionIds);

        this._onSubscriptionsChanged.fire();
    }

    readonly onSubscriptionsChanged = this._onSubscriptionsChanged.event;

    private isLoggedIn(): boolean {
        return this.storage.get('isLoggedIn', false);
    }
}

