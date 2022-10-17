import * as arm from '@azure/arm-subscriptions';
import * as vscode from 'vscode';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';

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

export interface AzureSubscriptionsResult {
    readonly status: AzureSubscriptionStatus;

    readonly allSubscriptions: AzureSubscription[];
    readonly selectedSubscriptions: AzureSubscription[];
}

export interface AzureSubscriptionProvider {
    getSubscriptions(): Promise<AzureSubscriptionsResult>;

    onSubscriptionsChanged: vscode.Event<void>;
}

export class VSCodeAzureSubscriptionProvider extends vscode.Disposable implements AzureSubscriptionProvider {
    private readonly _onSubscriptionsChanged = new vscode.EventEmitter<void>();

    constructor() {
        super(() => this._onSubscriptionsChanged.dispose());
    }

    async getSubscriptions(): Promise<AzureSubscriptionsResult> {
        // TODO: This needs to be environment-specific (in terms of default scopes).
        //const session = await vscode.authentication.getSession('microsoft', ['https://management.azure.com/.default', 'offline_access'], { createIfNone: true });

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

        const allSubscriptions = l.map(s => ({ displayName: s.displayName ?? 'name', id: s.subscriptionId ?? 'id', getSession: () => session}));

        return {
            status: session ? AzureSubscriptionStatus.LoggedIn : AzureSubscriptionStatus.LoggedOut,
            allSubscriptions,
            selectedSubscriptions: allSubscriptions
        };
    }

    readonly onSubscriptionsChanged = this._onSubscriptionsChanged.event;
}
