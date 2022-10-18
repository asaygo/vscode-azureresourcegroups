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
                getToken:
                    async scopes => {
                        // Try to get a session that best matches any additional requested scopes...
                        session = await this.getSession({ scopes });

                        if (session) {
                            return {
                                token: session.accessToken,
                                expiresOnTimestamp: 0
                            };
                        }

                        return null;
                    }
            });

        const l = await uiUtils.listAllIterator(client.subscriptions.list());

        const allSubscriptions = l.map(s => ({ displayName: s.displayName ?? 'name', id: s.subscriptionId ?? 'id', getSession: () => session }));

        const selectedSubscriptionIds = settingUtils.getGlobalSetting<string[] | undefined>('selectedSubscriptions');
        const selectedSubscriptions = allSubscriptions.filter(s => selectedSubscriptionIds === undefined || selectedSubscriptionIds.includes(s.id));

        const t = await uiUtils.listAllIterator(client.tenants.list());

        if (t && t.length) {
            const tenant = t[0];

            if (tenant.tenantId) {
                const tenantClient: arm.SubscriptionClient = new arm.SubscriptionClient(
                    {
                        getToken: async scopes => {
                            const tenantSession = await this.getSession({ scopes, tenantId: tenant.tenantId });

                            if (tenantSession) {
                                return {
                                    token: tenantSession.accessToken,
                                    expiresOnTimestamp: 0
                                };
                            }

                            return null;
                        },
                    });

                    const tenantSubscriptions = await uiUtils.listAllIterator(tenantClient.subscriptions.list());

                    if (tenantSubscriptions) {
                        // TODO: Add tenant subscriptions to allSubscriptions
                    }
                }
        }

        return {
            status: session ? AzureSubscriptionStatus.LoggedIn : AzureSubscriptionStatus.LoggedOut,
            allSubscriptions,
            selectedSubscriptions
        };
    }

    async logIn(): Promise<void> {
        const session = await this.getSession({ createNew: true });

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

    private getSession(options?: { createNew?: boolean, scopes?: string | string[], tenantId?: string }): Thenable<vscode.AuthenticationSession | undefined> {
        const scopeSet = new Set<string>(['https://management.azure.com/.default']);

        if (options) {
            if (typeof options.scopes === 'string') {
                scopeSet.add(options.scopes);
            }

            if (Array.isArray(options.scopes)) {
                for (const scope of options.scopes) {
                    scopeSet.add(scope);
                }
            }

            if (options.tenantId) {
                scopeSet.add(`VSCODE_TENANT:${options.tenantId}`);
            }
        }

        return vscode.authentication.getSession(
            'microsoft',
            Array.from(scopeSet),
            {
                clearSessionPreference: options?.createNew,
                createIfNone: options?.createNew
            });
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
