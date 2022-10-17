import { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureSubscriptionProvider } from '../../api/v2/subscriptions/AzureSubscriptionProvider';

export async function logOut(context: IActionContext, subscriptionProvider: AzureSubscriptionProvider): Promise<void> {
    await subscriptionProvider.logOut();
}
