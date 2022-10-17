import * as arm from '@azure/arm-subscriptions';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import * as vscode from 'vscode';
import { settingUtils } from '../../../utils/settingUtils';

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

        // Try to get the default session...
        let session = await this.getSession();

        if (!session) {
            return { status: AzureSubscriptionStatus.LoggedOut };
        }

        const client: arm.SubscriptionClient = new arm.SubscriptionClient(
            {
                async getToken(scopes) {
                    scopes = Array.isArray(scopes) ? scopes : [scopes];

                    // Try to get a session that best matches any additional requested scopes...
                    session = await vscode.authentication.getSession('microsoft', scopes);

                    if (session) {
                        return {
                            token: session.accessToken,
                            expiresOnTimestamp: 0
                        };
                    }

                    return null;
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
        const session = await this.getSession(true);

        if (session) {
            await this.updateStatus(true);
        }
    }

    async logOut(): Promise<void> {
        await this.updateStatus(false);
    }

    async selectSubscriptions(subscriptionIds: string[] | undefined): Promise<void> {
        await this.updateSelectedSubscriptions(subscriptionIds);

        this._onSubscriptionsChanged.fire();
    }

    readonly onSubscriptionsChanged = this._onSubscriptionsChanged.event;

    private isLoggedIn(): boolean {
        return this.storage.get('isLoggedIn', false);
    }

    private getSession(createNew: boolean = false): Thenable<vscode.AuthenticationSession | undefined> {
        return vscode.authentication.getSession('microsoft', ['https://management.azure.com/.default'], { clearSessionPreference: createNew, createIfNone: createNew });
    }

    private async updateStatus(isLoggedIn: boolean): Promise<void> {
        await this.storage.update('isLoggedIn', isLoggedIn);

        if (!isLoggedIn) {
            await this.updateSelectedSubscriptions(undefined);
        }

        this._onSubscriptionsChanged.fire();
    }

    private updateSelectedSubscriptions(subscriptionsIds: string[] | undefined): Promise<void> {
        return settingUtils.updateGlobalSetting<string[] | undefined>('selectedSubscriptions', subscriptionsIds);
    }
}

