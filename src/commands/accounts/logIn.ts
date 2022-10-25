import { IActionContext } from '@microsoft/vscode-azext-utils';
import { AzureSubscriptionProvider } from '../../services/AzureSubscriptionProvider';

export async function logIn(_context: IActionContext, subscriptionProvider: AzureSubscriptionProvider): Promise<void> {
    await subscriptionProvider.logIn();
}
