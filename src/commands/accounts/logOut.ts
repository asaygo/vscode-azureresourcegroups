import { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureSubscriptionProvider } from '../../services/AzureSubscriptionProvider';

export async function logOut(_context: IActionContext, subscriptionProvider: AzureSubscriptionProvider): Promise<void> {
    await subscriptionProvider.logOut();
}
