/*---------------------------------------------------------------------------------------------
*  Copyright (c) Microsoft Corporation. All rights reserved.
*  Licensed under the MIT License. See License.txt in the project root for license information.
*--------------------------------------------------------------------------------------------*/

import { getSubscriptionListStep, SubscriptionListStepContext } from "@microsoft/vscode-azext-azureutils";
import { AzureWizard, IActionContext, nonNullProp } from "@microsoft/vscode-azext-utils";
import { AzureSubscription } from "@microsoft/vscode-azext-utils/hostapi.v2";

// TODO: move similar method to shared package.
export async function pickSubscription(context: IActionContext): Promise<AzureSubscription> {
    const wizardContext: SubscriptionListStepContext = { ...context };
    const wizard = new AzureWizard(wizardContext, {
        promptSteps: [await getSubscriptionListStep(context)],
    });
    await wizard.prompt();
    return nonNullProp(wizardContext, 'subscription');
}
